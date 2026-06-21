"use client";

import { useEffect, useState } from "react";
import { ChipPicker } from "@/components";
import { CountryPicker } from "@/components/CountryPicker";
import { Sheet } from "@/components/Sheet";
import styles from "./AnswerPanel.module.css";

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

type AnswerPanelProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	title?: string;
	prompt?: string;
	answer: AnswerPanelAnswer | null;
	disabled?: boolean;
};

export function AnswerPanel({
	open,
	setOpen,
	title,
	prompt,
	answer,
	disabled = false,
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
						selectedChip={selectedChip}
						setSelectedChip={setSelectedChip}
						setTextAnswer={setTextAnswer}
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
	selectedChip,
	setSelectedChip,
	textAnswer,
	setTextAnswer,
}: {
	title: string;
	prompt?: string;
	answer: AnswerPanelAnswer;
	disabled: boolean;
	selectedChip: string | null;
	setSelectedChip: (value: string | null) => void;
	textAnswer: string;
	setTextAnswer: (value: string) => void;
}) {
	return (
		<div className={styles.answerPanel}>
			<p className={styles.answerPrompt}>
				{prompt ? <span>{prompt} </span> : null}
				<strong>{title}</strong>
			</p>

			{answer.kind === "choices" ? (
				<>
					<ChipPicker
						disabled={disabled}
						onChange={setSelectedChip}
						options={answer.choices.map((choice) => ({
							label: choice,
							value: choice,
						}))}
						value={selectedChip}
					/>
					<PanelFooter
						canSubmit={Boolean(selectedChip)}
						disabled={disabled}
						onSubmit={() => {
							if (selectedChip) {
								answer.onSubmit(selectedChip);
							}
						}}
					/>
				</>
			) : null}

			{answer.kind === "text" || answer.kind === "country" ? (
				<>
					{answer.kind === "country" ? (
						<CountryPicker
							classNames={{
								control: styles.countryPickerControl,
								popover: styles.countryPickerPopover,
								searchInput: styles.countryPickerSearch,
								option: styles.countryPickerOption,
								optionSelected: styles.countryPickerOptionSelected,
							}}
							disabled={disabled}
							onChange={setTextAnswer}
							placeholder={answer.placeholder ?? "Country"}
							searchPlaceholder="Search countries..."
							value={textAnswer}
						/>
					) : (
						<input
							className={styles.textInput}
							disabled={disabled}
							onChange={(event) => setTextAnswer(event.target.value)}
							placeholder={answer.placeholder ?? "Your answer"}
							value={textAnswer}
						/>
					)}
					<PanelFooter
						canSubmit={Boolean(textAnswer.trim())}
						disabled={disabled}
						onSubmit={() => {
							const trimmedAnswer = textAnswer.trim();
							if (trimmedAnswer) {
								answer.onSubmit(trimmedAnswer);
							}
						}}
					/>
				</>
			) : null}
		</div>
	);
}

function PanelFooter({
	canSubmit,
	disabled,
	onSubmit,
}: {
	canSubmit: boolean;
	disabled: boolean;
	onSubmit: () => void;
}) {
	return (
		<div className={styles.panelFooter}>
			<button
				className={styles.primaryButton}
				disabled={disabled || !canSubmit}
				onClick={onSubmit}
				type="button"
			>
				Submit
			</button>
		</div>
	);
}
