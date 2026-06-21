"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { ChipPicker, Field } from "@/components";
import QuestionEntryEditorLayout from "./QuestionEntryEditorLayout";
import { useQuestionEditorArrowNavigation } from "./useQuestionEditorArrowNavigation";

type OrderItemsQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "ORDER_ITEMS" }
>;

type OrderItemsEditorProps = {
	card: OrderItemsQuestionCardInput;
	entryIndex: number;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	isSubmitting: boolean;
	onEntryAnswerChange: (entryIndex: number, answer: number) => void;
	onEntryExplanationChange: (entryIndex: number, value: string) => void;
	onEntryTextChange: (entryIndex: number, value: string) => void;
	open: boolean;
};

export default function OrderItemsEditor({
	card,
	entryIndex,
	getFieldError,
	isSubmitting,
	onEntryAnswerChange,
	onEntryExplanationChange,
	onEntryTextChange,
	open,
}: OrderItemsEditorProps) {
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
				description="Each position should be used once across the card."
				error={getFieldError("entries", entryIndex, "answer")}
				label="Correct position"
			>
				<ChipPicker
					disabled={isSubmitting}
					onChange={(answer) => onEntryAnswerChange(entryIndex, Number(answer))}
					options={card.entries.map((_, positionIndex) => ({
						label: `#${positionIndex + 1}`,
						value: String(positionIndex + 1),
					}))}
					value={String(entry.answer)}
				/>
			</Field>
		</QuestionEntryEditorLayout>
	);
}
