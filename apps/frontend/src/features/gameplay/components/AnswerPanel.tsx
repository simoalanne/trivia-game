"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Sheet } from "@/components/Sheet";
import { cn } from "@/lib/utils";

type ChoiceAnswer = {
	kind: "choices";
	choices: string[];
	onSubmit: (answer: string) => void;
};

type TextAnswer = {
	kind: "text";
	placeholder?: string;
	onSubmit: (answer: string) => void;
};

type CountryAnswer = {
	kind: "country";
	placeholder?: string;
	onSubmit: (answer: string) => void;
};

export type AnswerPanelAnswer = ChoiceAnswer | TextAnswer | CountryAnswer;

export type AnswerPanelResult = {
	answer: string;
	isCorrect: boolean;
};

type AnswerPanelProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	title?: string;
	prompt?: string;
	answer: AnswerPanelAnswer | null;
	disabled?: boolean;
	result?: AnswerPanelResult | null;
	submitting?: boolean;
};

export function AnswerPanel({
	open,
	setOpen,
	title,
	prompt,
	answer,
	disabled = false,
	result = null,
	submitting = false,
}: AnswerPanelProps) {
	const [selectedChip, setSelectedChip] = useState<string | null>(null);
	const [textAnswer, setTextAnswer] = useState("");
	const trimmedPrompt = prompt?.trim();
	const answerResetKey = answer ? `${answer.kind}:${title}` : "empty";

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset answer controls when the selected prompt changes.
	useEffect(() => {
		setSelectedChip(null);
		setTextAnswer("");
	}, [answerResetKey]);

	return (
		<Sheet
			content={
				answer ? (
					<AnswerPanelContent
						answer={answer}
						disabled={disabled}
						prompt={trimmedPrompt}
						result={result}
						selectedChip={selectedChip}
						setSelectedChip={setSelectedChip}
						setTextAnswer={setTextAnswer}
						submitting={submitting}
						textAnswer={textAnswer}
						title={title ?? ""}
					/>
				) : null
			}
			open={open && Boolean(answer)}
			setOpen={setOpen}
			title="Answer the question"
		/>
	);
}

function AnswerPanelContent({
	title,
	prompt,
	answer,
	disabled,
	result,
	selectedChip,
	setSelectedChip,
	textAnswer,
	setTextAnswer,
	submitting,
}: {
	title: string;
	prompt?: string;
	answer: AnswerPanelAnswer;
	disabled: boolean;
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

			{answer.kind === "choices" ? (
				<>
					<div className="flex flex-wrap gap-2">
						{answer.choices.map((choice) => {
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
								answer.onSubmit(selectedChip);
							}
						}}
						tone={submitButtonTone}
					/>
				</>
			) : null}

			{answer.kind === "text" || answer.kind === "country" ? (
				<>
					{answer.kind === "country" ? (
						<CountryPicker
							disabled={isBusy}
							onChange={setTextAnswer}
							placeholder={answer.placeholder ?? "Country"}
							value={textAnswer}
						/>
					) : (
						<input
							className="input w-full"
							disabled={isBusy}
							onChange={(event) => setTextAnswer(event.target.value)}
							placeholder={answer.placeholder ?? "Your answer"}
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
								answer.onSubmit(trimmedAnswer);
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

	return (
		<div className="grid">
			<button
				aria-disabled={isDisabled}
				className={cn(
					"btn btn-block",
					tone === "correct"
						? "btn-success"
						: tone === "wrong"
							? "btn-error"
							: "btn-primary",
				)}
				disabled={!isResolved && isDisabled}
				onClick={() => {
					if (!isDisabled) {
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
