"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { ChipPicker } from "@/components";
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
			getFieldError={getFieldError}
			onEntryTextChange={onEntryTextChange}
			prompt={card.prompt}
			text={entry.text}
		>
			<fieldset className="fieldset w-full gap-2">
				<legend className="fieldset-legend text-sm font-semibold">
					Correct answer
				</legend>
				<ChipPicker
					disabled={isSubmitting}
					onChange={(answer) =>
						onEntryAnswerChange(entryIndex, answer === "true")
					}
					options={trueOrFalseOptions}
					value={entry.answer ? "true" : "false"}
				/>
				{getFieldError("entries", entryIndex, "answer") ? (
					<p className="label px-0 text-sm font-semibold text-error">
						{getFieldError("entries", entryIndex, "answer")}
					</p>
				) : null}
			</fieldset>
		</QuestionEntryEditorLayout>
	);
}
