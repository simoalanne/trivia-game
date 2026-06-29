"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { ChipPicker } from "@/components";
import QuestionEntryEditorLayout from "./QuestionEntryEditorLayout";
import { useQuestionEditorArrowNavigation } from "./useQuestionEditorArrowNavigation";

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
	onEntryTextChange: (entryIndex: number, value: string) => void;
};

export default function MultipleChoiceEditor({
	card,
	entryIndex,
	getFieldError,
	isSubmitting,
	open,
	onEntryAnswerChange,
	onEntryTextChange,
}: MultipleChoiceEditorProps) {
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
					Correct choice
				</legend>
				<ChipPicker
					disabled={isSubmitting}
					onChange={(answer) => onEntryAnswerChange(entryIndex, answer)}
					options={card.choices.map((choice, choiceIndex) => ({
						label: choice || `Choice ${choiceIndex + 1}`,
						value: choice,
					}))}
					value={entry.answer || null}
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
