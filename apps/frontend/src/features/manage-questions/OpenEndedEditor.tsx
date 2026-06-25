"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { Button, Field, TextInput } from "@/components";
import { CountryPicker } from "@/components/CountryPicker";
import styles from "./QuestionEntryEditor.module.css";
import QuestionEntryEditorLayout from "./QuestionEntryEditorLayout";
import { useQuestionEditorArrowNavigation } from "./useQuestionEditorArrowNavigation";

type OpenEndedQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "OPEN_ENDED" }
>;

type OpenEndedEditorProps = {
	card: OpenEndedQuestionCardInput;
	entryIndex: number;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	isSubmitting: boolean;
	onAddAcceptedAnswer: (entryIndex: number) => void;
	onEntryAcceptedAnswerChange: (
		entryIndex: number,
		answerIndex: number,
		value: string,
	) => void;
	onEntryExplanationChange: (entryIndex: number, value: string) => void;
	onEntryTextChange: (entryIndex: number, value: string) => void;
	onRemoveAcceptedAnswer: (entryIndex: number, answerIndex: number) => void;
	open: boolean;
};

export default function OpenEndedEditor({
	card,
	entryIndex,
	getFieldError,
	isSubmitting,
	onAddAcceptedAnswer,
	onEntryAcceptedAnswerChange,
	onEntryExplanationChange,
	onEntryTextChange,
	onRemoveAcceptedAnswer,
	open,
}: OpenEndedEditorProps) {
	const entry = card.entries[entryIndex];

	useQuestionEditorArrowNavigation(open);

	if (!entry) {
		return null;
	}

	return (
		<QuestionEntryEditorLayout
			entryIndex={entryIndex}
			explanation={entry.explanation}
			getFieldError={getFieldError}
			onEntryExplanationChange={onEntryExplanationChange}
			onEntryTextChange={onEntryTextChange}
			prompt={card.prompt}
			text={entry.text}
		>
			<Field
				error={getFieldError("entries", entryIndex, "answer")}
				label="Accepted answers"
			>
				<div className={styles.listEditor}>
					{entry.answer.map((answer, answerIndex) => (
						<div
							className={styles.rowEditor}
							key={`accepted-answer-${entryIndex}-${answerIndex}`}
						>
							{card.uiHint === "country" ? (
								<CountryPicker
									onChange={(value) =>
										onEntryAcceptedAnswerChange(
											entryIndex,
											answerIndex,
											value.toUpperCase(),
										)
									}
									placeholder={`Country ${answerIndex + 1}`}
									value={answer}
								/>
							) : (
								<TextInput
									invalid={Boolean(
										getFieldError("entries", entryIndex, "answer", answerIndex),
									)}
									onChange={(event) =>
										onEntryAcceptedAnswerChange(
											entryIndex,
											answerIndex,
											event.target.value,
										)
									}
									placeholder={`Accepted answer ${answerIndex + 1}`}
									value={answer}
								/>
							)}
							{card.uiHint !== "country" && (
								<Button
									disabled={isSubmitting || entry.answer.length <= 1}
									onClick={() =>
										onRemoveAcceptedAnswer(entryIndex, answerIndex)
									}
									size="sm"
									variant="ghost"
								>
									Remove
								</Button>
							)}
						</div>
					))}
					{card.uiHint !== "country" && (
						<button
							className={styles.inlineAction}
							disabled={isSubmitting}
							onClick={() => onAddAcceptedAnswer(entryIndex)}
							type="button"
						>
							Add answer
						</button>
					)}
				</div>
			</Field>
		</QuestionEntryEditorLayout>
	);
}
