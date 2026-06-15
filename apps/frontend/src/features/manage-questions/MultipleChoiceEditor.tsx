"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { useEffect } from "react";
import { ChipPicker, Field, TextInput } from "@/components";
import styles from "./MultipleChoiceEditor.module.css";

type MultipleChoiceQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "MULTIPLE_CHOICE" }
>;

type MultipleChoiceEditorProps = {
	card: MultipleChoiceQuestionCardInput;
	entryIndex: number;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	isSubmitting: boolean;
	open: boolean;
	onEntryAnswerChange: (entryIndex: number, answer: string) => void;
	onEntryExplanationChange: (entryIndex: number, value: string) => void;
	onEntryTextChange: (entryIndex: number, value: string) => void;
};

export default function MultipleChoiceEditor({
	card,
	entryIndex,
	getFieldError,
	isSubmitting,
	open,
	onEntryAnswerChange,
	onEntryExplanationChange,
	onEntryTextChange,
}: MultipleChoiceEditorProps) {
	const entry = card.entries[entryIndex];

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey
			) {
				return;
			}

			if (event.key === "ArrowLeft") {
				const activeElement = document.activeElement;
				if (
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement
				) {
					return;
				}

				event.preventDefault();
				window.dispatchEvent(new CustomEvent("question-editor-previous-entry"));
				return;
			}

			if (event.key === "ArrowRight") {
				const activeElement = document.activeElement;
				if (
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement
				) {
					return;
				}

				event.preventDefault();
				window.dispatchEvent(new CustomEvent("question-editor-next-entry"));
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	if (!entry) {
		return null;
	}

	return (
		<div className={styles.scrollBody}>
			<p className={styles.metaText}>
				{card.prompt.trim() ||
					"Set a card prompt from the center of the wheel."}
			</p>

			<Field
				error={getFieldError("entries", entryIndex, "text")}
				htmlFor="entry-text"
				label={`Entry ${entryIndex + 1} text`}
			>
				<TextInput
					id="entry-text"
					invalid={Boolean(getFieldError("entries", entryIndex, "text"))}
					onChange={(event) =>
						onEntryTextChange(entryIndex, event.target.value)
					}
					placeholder="What players see for this slot"
					value={entry.text}
				/>
			</Field>

			<Field
				error={getFieldError("entries", entryIndex, "explanation")}
				htmlFor="entry-explanation"
				label="Explanation"
			>
				<TextInput
					id="entry-explanation"
					invalid={Boolean(getFieldError("entries", entryIndex, "explanation"))}
					onChange={(event) =>
						onEntryExplanationChange(entryIndex, event.target.value)
					}
					placeholder="Optional explanation shown after answering"
					value={entry.explanation ?? ""}
				/>
			</Field>

			<Field
				error={getFieldError("entries", entryIndex, "answer")}
				label="Correct choice"
			>
				<ChipPicker
					disabled={isSubmitting}
					onChange={(answer) => onEntryAnswerChange(entryIndex, answer)}
					options={card.choices.map((choice, choiceIndex) => ({
						label: choice || `Choice ${choiceIndex + 1}`,
						value: choice,
					}))}
					value={entry.answer || null}
				/>
			</Field>
		</div>
	);
}
