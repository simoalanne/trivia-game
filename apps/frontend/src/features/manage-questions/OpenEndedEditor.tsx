"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { CountryPicker } from "@/components/CountryPicker";
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
			<fieldset className="fieldset w-full gap-2">
				<legend className="fieldset-legend text-sm font-semibold">
					Accepted answers
				</legend>
				<div className="grid gap-3">
					{entry.answer.map((answer, answerIndex) => (
						<div
							className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[760px]:grid-cols-1"
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
								<input
									aria-invalid={
										Boolean(
											getFieldError(
												"entries",
												entryIndex,
												"answer",
												answerIndex,
											),
										) || undefined
									}
									className={`input w-full ${
										getFieldError("entries", entryIndex, "answer", answerIndex)
											? "input-error"
											: ""
									}`}
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
								<button
									className="btn btn-ghost btn-sm"
									disabled={isSubmitting || entry.answer.length <= 1}
									onClick={() =>
										onRemoveAcceptedAnswer(entryIndex, answerIndex)
									}
									type="button"
								>
									Remove
								</button>
							)}
						</div>
					))}
					{card.uiHint !== "country" && (
						<button
							className="btn btn-sm"
							disabled={isSubmitting}
							onClick={() => onAddAcceptedAnswer(entryIndex)}
							type="button"
						>
							Add answer
						</button>
					)}
				</div>
				{getFieldError("entries", entryIndex, "answer") ? (
					<p className="label px-0 text-sm font-semibold text-error">
						{getFieldError("entries", entryIndex, "answer")}
					</p>
				) : null}
			</fieldset>
		</QuestionEntryEditorLayout>
	);
}
