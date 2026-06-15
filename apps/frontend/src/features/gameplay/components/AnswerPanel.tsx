"use client";

import { useEffect, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Sheet } from "@/components/Sheet";
import styles from "./AnswerPanel.module.css";

type TrueOrFalseAnswer = {
	format: "TRUE_OR_FALSE";
	onSubmit: (answer: boolean) => void;
};

type MultipleChoiceAnswer = {
	format: "MULTIPLE_CHOICE";
	choices: string[];
	onSubmit: (answer: string) => void;
};

type OrderItemsAnswer = {
	format: "ORDER_ITEMS";
	positions: number[];
	onSubmit: (answer: number) => void;
};

type OpenEndedAnswer = {
	format: "OPEN_ENDED";
	placeholder?: string;
	uiHint?: "country";
	onSubmit: (answer: string) => void;
};

export type AnswerPanelAnswer =
	| TrueOrFalseAnswer
	| MultipleChoiceAnswer
	| OrderItemsAnswer
	| OpenEndedAnswer;

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
	const answerResetKey = answer ? `${answer.format}:${title}` : "empty";

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

			{answer.format === "TRUE_OR_FALSE" ? (
				<div className={styles.answerButtons}>
					<button
						className={styles.primaryButton}
						disabled={disabled}
						onClick={() => answer.onSubmit(true)}
						type="button"
					>
						True
					</button>
					<button
						className={styles.dangerButton}
						disabled={disabled}
						onClick={() => answer.onSubmit(false)}
						type="button"
					>
						False
					</button>
				</div>
			) : null}

			{answer.format === "MULTIPLE_CHOICE" ? (
				<>
					<div className={styles.chipGrid}>
						{answer.choices.map((choice) => (
							<button
								aria-pressed={selectedChip === choice}
								className={`${styles.chip} ${
									selectedChip === choice ? styles.selectedChip : ""
								}`}
								disabled={disabled}
								key={choice}
								onClick={() => setSelectedChip(choice)}
								type="button"
							>
								{choice}
							</button>
						))}
					</div>
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

			{answer.format === "ORDER_ITEMS" ? (
				<>
					<div className={styles.orderGrid}>
						{answer.positions.map((position) => {
							const value = String(position);

							return (
								<button
									aria-pressed={selectedChip === value}
									className={`${styles.orderChip} ${
										selectedChip === value ? styles.selectedChip : ""
									}`}
									disabled={disabled}
									key={position}
									onClick={() => setSelectedChip(value)}
									type="button"
								>
									{position}
								</button>
							);
						})}
					</div>
					<PanelFooter
						canSubmit={Boolean(selectedChip)}
						disabled={disabled}
						onSubmit={() => {
							if (selectedChip) {
								answer.onSubmit(Number(selectedChip));
							}
						}}
					/>
				</>
			) : null}

			{answer.format === "OPEN_ENDED" ? (
				<>
					{answer.uiHint === "country" ? (
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
