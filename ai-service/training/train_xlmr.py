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
    parser.add_argument("--label-field", default="label", help="Dataset field containing integer labels")
    parser.add_argument("--epochs", type=float, default=4)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--max-steps", type=int, default=-1)
    args = parser.parse_args()

    labels = [item.strip() for item in args.labels.split(",") if item.strip()]
    dataset = load_dataset("json", data_files=args.data, split="train")
    if args.label_field != "label":
        if "label" in dataset.column_names:
            dataset = dataset.remove_columns("label")
        dataset = dataset.rename_column(args.label_field, "label")
    split = dataset.train_test_split(test_size=0.2, seed=42)
    tokenizer = AutoTokenizer.from_pretrained(args.model)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=args.max_length)

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

    trainer_args = TrainingArguments(
            output_dir=args.output,
            num_train_epochs=args.epochs,
            max_steps=args.max_steps,
            per_device_train_batch_size=args.batch_size,
            per_device_eval_batch_size=args.batch_size,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="f1_macro",
            report_to="none",
        )
    trainer_kwargs = dict(
        model=model,
        args=trainer_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=metrics,
    )
    try:
        trainer = Trainer(processing_class=tokenizer, **trainer_kwargs)
    except TypeError:
        trainer = Trainer(tokenizer=tokenizer, **trainer_kwargs)
    trainer.train()
    trainer.save_model(args.output)
    tokenizer.save_pretrained(args.output)


if __name__ == "__main__":
    main()
