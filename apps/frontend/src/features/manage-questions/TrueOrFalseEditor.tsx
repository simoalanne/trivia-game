"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { ChipPicker, Field } from "@/components";
import QuestionEntryEditorLayout from "./QuestionEntryEditorLayout";
import { useQuestionEditorArrowNavigation } from "./useQuestionEditorArrowNavigation";

type TrueOrFalseQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "TRUE_OR_FALSE" }
>;

type TrueOrFalseEditorProps = {
	card: TrueOrFalseQuestionCardInput;
	entryIndex: number;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	isSubmitting: boolean;
	onEntryAnswerChange: (entryIndex: number, answer: boolean) => void;
	onEntryExplanationChange: (entryIndex: number, value: string) => void;
	onEntryTextChange: (entryIndex: number, value: string) => void;
	open: boolean;
};

const trueOrFalseOptions = [
	{ label: "True", value: "true" },
	{ label: "False", value: "false" },
];

export default function TrueOrFalseEditor({
	card,
	entryIndex,
	getFieldError,
	isSubmitting,
	onEntryAnswerChange,
	onEntryExplanationChange,
	onEntryTextChange,
	open,
}: TrueOrFalseEditorProps) {
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
				label="Correct answer"
			>
				<ChipPicker
					disabled={isSubmitting}
					onChange={(answer) =>
						onEntryAnswerChange(entryIndex, answer === "true")
					}
					options={trueOrFalseOptions}
					value={entry.answer ? "true" : "false"}
				/>
			</Field>
		</QuestionEntryEditorLayout>
	);
}
