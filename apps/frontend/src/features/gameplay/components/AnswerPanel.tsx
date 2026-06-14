"use client";

import { useEffect, useState } from "react";
import { CountryPicker } from "@/components/CountryPicker";
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
	title: string;
	prompt?: string;
	answer: AnswerPanelAnswer;
	onSkip: () => void;
	disabled?: boolean;
};

export function AnswerPanel({
	title,
	prompt,
	answer,
	onSkip,
	disabled = false,
}: AnswerPanelProps) {
	const [selectedChip, setSelectedChip] = useState<string | null>(null);
	const [textAnswer, setTextAnswer] = useState("");
	const trimmedPrompt = prompt?.trim();
	const answerResetKey = `${answer.format}:${title}`;

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset answer controls when the selected prompt changes.
	useEffect(() => {
		setSelectedChip(null);
		setTextAnswer("");
	}, [answerResetKey]);

	// TODO: Promote this from an inline panel to a first-class dialog surface.
	// Desktop should likely use a modal; mobile should likely use a bottom sheet.
	return (
		<div className={styles.answerPanel}>
			<p className={styles.answerPrompt}>
				{trimmedPrompt ? <span>{trimmedPrompt} </span> : null}
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
					<button
						className={styles.neutralButton}
						disabled={disabled}
						onClick={onSkip}
						type="button"
					>
						I don&apos;t know
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
						onSkip={onSkip}
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
						onSkip={onSkip}
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
						onSkip={onSkip}
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
	onSkip,
	onSubmit,
}: {
	canSubmit: boolean;
	disabled: boolean;
	onSkip: () => void;
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
			<button
				className={styles.neutralButton}
				disabled={disabled}
				onClick={onSkip}
				type="button"
			>
				I don&apos;t know
			</button>
		</div>
	);
}
