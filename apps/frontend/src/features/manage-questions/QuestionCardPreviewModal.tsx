"use client";

import type { QuestionCard, QuestionCardInput } from "@packages/contracts";
import { Modal, TriviaCard, type TriviaCardItem } from "@/components";

type QuestionCardPreviewModalProps = {
	open: boolean;
	/** A saved card, or an unsaved one such as an assistant proposal. */
	question: QuestionCard | QuestionCardInput | null;
	setOpen: (open: boolean) => void;
};

const toTriviaCardItems = (
	question: QuestionCard | QuestionCardInput,
): TriviaCardItem[] =>
	question.entries.map((entry, index) => ({
		id: String(index),
		label: entry.text,
		answer: entry.answer,
	}));

export default function QuestionCardPreviewModal({
	open,
	question,
	setOpen,
}: QuestionCardPreviewModalProps) {
	if (!question) {
		return null;
	}

	return (
		<Modal
			open={open}
			setOpen={setOpen}
			size="lg"
			mobileSheet={false}
			title={
				"id" in question
					? `Preview Trivia Card #${question.id}`
					: "Preview Trivia Card"
			}
		>
			<div className="px-3 py-2">
				<TriviaCard
					items={toTriviaCardItems(question)}
					onSelectedItemChange={() => {}}
					prompt={question.prompt}
					readOnly
					selectedItemId={null}
					showSelectedStyling={false}
				/>
			</div>
		</Modal>
	);
}
