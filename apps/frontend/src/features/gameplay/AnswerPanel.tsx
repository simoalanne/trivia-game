"use client";

import type { GameplayState } from "@packages/contracts";
import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";

export type AnswerPanelResult = {
	answer: string;
	isCorrect: boolean;
};

type AnswerPanelProps = {
	card: NonNullable<GameplayState["card"]> | null;
	entryIndex: number | null;
	open: boolean;
	setOpen: (open: boolean) => void;
	onSubmit: (entryIndex: number, answer: string) => void;
	disabled?: boolean;
	result?: AnswerPanelResult | null;
	submitting?: boolean;
};

export function AnswerPanel({
	card,
	entryIndex,
	open,
	setOpen,
	onSubmit,
	disabled = false,
	result = null,
	submitting = false,
}: AnswerPanelProps) {
	const [selectedChip, setSelectedChip] = useState<string | null>(null);
	const [textAnswer, setTextAnswer] = useState("");
	const selectedEntry =
		card !== null && entryIndex !== null
			? (card.entries[entryIndex] ?? null)
			: null;
	const trimmedPrompt = card?.prompt.trim();
	const answerResetKey =
		card && selectedEntry
			? `${card.answerMode}:${selectedEntry.text}`
			: "empty";

	useEffect(() => {
		setSelectedChip(null);
		setTextAnswer("");
	}, [answerResetKey]);

	return (
		<Modal
			content={
				card && selectedEntry && entryIndex !== null ? (
					<AnswerPanelContent
						card={card}
						disabled={disabled}
						entryIndex={entryIndex}
						onSubmit={onSubmit}
						prompt={trimmedPrompt}
						result={result}
						selectedChip={selectedChip}
						setSelectedChip={setSelectedChip}
						setTextAnswer={setTextAnswer}
						submitting={submitting}
						textAnswer={textAnswer}
						title={selectedEntry.text}
					/>
				) : null
			}
			open={open && Boolean(card) && Boolean(selectedEntry)}
			setOpen={setOpen}
			title="Answer the question"
		/>
	);
}

function AnswerPanelContent({
	title,
	prompt,
	card,
	disabled,
	entryIndex,
	onSubmit,
	result,
	selectedChip,
	setSelectedChip,
	textAnswer,
	setTextAnswer,
	submitting,
}: {
	title: string;
	prompt?: string;
	card: NonNullable<GameplayState["card"]>;
	disabled: boolean;
	entryIndex: number;
	onSubmit: (entryIndex: number, answer: string) => void;
	result: AnswerPanelResult | null;
	selectedChip: string | null;
	setSelectedChip: (value: string | null) => void;
	textAnswer: string;
	setTextAnswer: (value: string) => void;
	submitting: boolean;
}) {
	const isResolved = Boolean(result);
	const isBusy = disabled || submitting || isResolved;
	const submitButtonLabel = result
		? result.isCorrect
			? "Correct"
			: "Wrong"
		: submitting
			? "Submitting..."
			: "Submit";
	const submitButtonTone = result
		? result.isCorrect
			? "correct"
			: "wrong"
		: submitting
			? "submitting"
			: "default";

	return (
		<div className="grid gap-5">
			<p className="max-w-prose text-base leading-snug font-semibold wrap-break-word">
				{prompt ? <span>{prompt} </span> : null}
				<strong className="text-primary font-bold">{title}</strong>
			</p>

			{card.answerMode === "CHOICES" ? (
				<>
					<div className="flex flex-wrap gap-2">
						{card.choices.map((choice) => {
							const isSelected = selectedChip === choice;

							return (
								<button
									aria-pressed={isSelected}
									className={cn(
										"btn btn-lg h-auto min-h-10 rounded-full whitespace-normal",
										isSelected ? "btn-primary" : "btn-outline",
									)}
									disabled={isBusy}
									key={choice}
									onClick={() => setSelectedChip(choice)}
									type="button"
								>
									{choice}
								</button>
							);
						})}
					</div>
					<PanelFooter
						canSubmit={Boolean(selectedChip)}
						disabled={isBusy}
						label={submitButtonLabel}
						onSubmit={() => {
							if (selectedChip) {
								onSubmit(entryIndex, selectedChip);
							}
						}}
						tone={submitButtonTone}
					/>
				</>
			) : null}

			{card.answerMode !== "CHOICES" ? (
				<>
					{card.answerMode === "COUNTRY" ? (
						<CountryPicker
							disabled={isBusy}
							onChange={setTextAnswer}
							placeholder="Country"
							value={textAnswer}
						/>
					) : (
						<input
							className="input w-full"
							disabled={isBusy}
							onChange={(event) => setTextAnswer(event.target.value)}
							placeholder="Your answer"
							type="text"
							value={textAnswer}
						/>
					)}
					<PanelFooter
						canSubmit={Boolean(textAnswer.trim())}
						disabled={isBusy}
						label={submitButtonLabel}
						onSubmit={() => {
							const trimmedAnswer = textAnswer.trim();
							if (trimmedAnswer) {
								onSubmit(entryIndex, trimmedAnswer);
							}
						}}
						tone={submitButtonTone}
					/>
				</>
			) : null}
		</div>
	);
}

function PanelFooter({
	canSubmit,
	disabled,
	label,
	onSubmit,
	tone,
}: {
	canSubmit: boolean;
	disabled: boolean;
	label: string;
	onSubmit: () => void;
	tone: "default" | "submitting" | "correct" | "wrong";
}) {
	const isResolved = tone === "correct" || tone === "wrong";
	const isDisabled = disabled || !canSubmit;
	const isSubmitDisabled = !isResolved && isDisabled;

	return (
		<div className="grid">
			<button
				aria-disabled={isSubmitDisabled}
				className={cn(
					"btn btn-block",
					tone === "correct"
						? "btn-success"
						: tone === "wrong"
							? "btn-error"
							: "btn-primary",
					isResolved ? "pointer-events-none" : null,
				)}
				disabled={isSubmitDisabled}
				onClick={() => {
					if (!isDisabled && !isResolved) {
						onSubmit();
					}
				}}
				type="button"
			>
				{tone === "submitting" ? (
					<span
						aria-hidden="true"
						className="loading loading-spinner loading-sm"
					/>
				) : null}
				{tone === "correct" ? (
					<CheckIcon aria-hidden="true" className="size-4" />
				) : null}
				{tone === "wrong" ? (
					<XIcon aria-hidden="true" className="size-4" />
				) : null}
				{label}
			</button>
		</div>
	);
}
