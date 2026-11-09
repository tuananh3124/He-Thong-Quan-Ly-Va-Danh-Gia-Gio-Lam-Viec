"""Fine-tune XLM-R for evidence document classification.

Input JSONL fields: {"text": "...", "label": 0}
The resulting directory is a real task-specific EvidenceXLMR checkpoint and
can be loaded by the API with ANALYZER_MODEL_PATH.
"""
from __future__ import annotations

import argparse
import numpy as np
from datasets import load_dataset
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="JSONL file with text and integer label")
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="FacebookAI/xlm-roberta-base")
    parser.add_argument("--labels", required=True, help="Comma-separated labels in id order")
    parser.add_argument("--epochs", type=float, default=4)
    parser.add_argument("--batch-size", type=int, default=8)
    args = parser.parse_args()

    labels = [item.strip() for item in args.labels.split(",") if item.strip()]
    dataset = load_dataset("json", data_files=args.data, split="train")
    split = dataset.train_test_split(test_size=0.2, seed=42)
    tokenizer = AutoTokenizer.from_pretrained(args.model)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=512)

    tokenized = split.map(tokenize, batched=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=len(labels),
        id2label={index: label for index, label in enumerate(labels)},
        label2id={label: index for index, label in enumerate(labels)},
    )

    def metrics(eval_prediction):
        predictions, target = eval_prediction
        predicted = np.argmax(predictions, axis=-1)
        return {
            "accuracy": accuracy_score(target, predicted),
            "f1_macro": f1_score(target, predicted, average="macro"),
        }

    trainer = Trainer(
        model=model,
        args=TrainingArguments(
            output_dir=args.output,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            per_device_eval_batch_size=args.batch_size,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1_macro",
            report_to="none",
        ),
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=metrics,
    )
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)


if __name__ == "__main__":
    main()
