"use client";

import type { QuestionCard } from "@packages/contracts";
import { Modal, TriviaCard, type TriviaCardItem } from "@/components";

type QuestionCardPreviewModalProps = {
	open: boolean;
	question: QuestionCard | null;
	setOpen: (open: boolean) => void;
};

const toTriviaCardItems = (question: QuestionCard): TriviaCardItem[] =>
	question.entries.map((entry, index) => ({
		id: `${question.id}-${index}`,
		label: entry.text,
		answer: entry.answer,
		answerUiHint: question.answerMode === "COUNTRY" ? "country" : undefined,
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
			title={`Preview Trivia Card #${question.id}`}
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
