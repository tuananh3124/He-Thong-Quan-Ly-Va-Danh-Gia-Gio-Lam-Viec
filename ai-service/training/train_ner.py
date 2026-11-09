"""Fine-tune XLM-R for evidence field extraction (BIO token classification).

Input JSONL fields: {"tokens": ["Title", ":", "..."], "ner_tags": [0, 0, 1]}
"""
from __future__ import annotations

import argparse
import numpy as np
from datasets import load_dataset
from seqeval.metrics import f1_score
from transformers import (
    AutoModelForTokenClassification,
    AutoTokenizer,
    DataCollatorForTokenClassification,
    Trainer,
    TrainingArguments,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="FacebookAI/xlm-roberta-base")
    parser.add_argument("--labels", required=True, help="Comma-separated BIO labels")
    args = parser.parse_args()
    labels = [item.strip() for item in args.labels.split(",") if item.strip()]

    dataset = load_dataset("json", data_files=args.data, split="train")
    split = dataset.train_test_split(test_size=0.2, seed=42)
    tokenizer = AutoTokenizer.from_pretrained(args.model)

    def tokenize_and_align(batch):
        encoded = tokenizer(batch["tokens"], is_split_into_words=True, truncation=True, max_length=512)
        aligned = []
        for row, encoding in enumerate(encoded.encodings):
            word_ids = encoding.word_ids
            previous = None
            tags = []
            for word_id in word_ids:
                if word_id is None:
                    tags.append(-100)
                elif word_id != previous:
                    tags.append(batch["ner_tags"][row][word_id])
                else:
                    tags.append(-100)
                previous = word_id
            aligned.append(tags)
        encoded["labels"] = aligned
        return encoded

    tokenized = split.map(tokenize_and_align, batched=True, remove_columns=split["train"].column_names)
    model = AutoModelForTokenClassification.from_pretrained(
        args.model,
        num_labels=len(labels),
        id2label={index: label for index, label in enumerate(labels)},
        label2id={label: index for index, label in enumerate(labels)},
    )

    def metrics(eval_prediction):
        logits, target = eval_prediction
        predicted = np.argmax(logits, axis=-1)
        true_labels, true_predictions = [], []
        for prediction_row, target_row in zip(predicted, target):
            current_labels, current_predictions = [], []
            for prediction, actual in zip(prediction_row, target_row):
                if actual != -100:
                    current_labels.append(labels[actual])
                    current_predictions.append(labels[prediction])
            true_labels.append(current_labels)
            true_predictions.append(current_predictions)
        return {"f1": f1_score(true_labels, true_predictions)}

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=args.output,
            num_train_epochs=4,
            per_device_train_batch_size=8,
            per_device_eval_batch_size=8,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1",
            report_to="none",
        ),
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        tokenizer=tokenizer,
        data_collator=DataCollatorForTokenClassification(tokenizer),
        compute_metrics=metrics,
    )
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)


if __name__ == "__main__":
    main()
