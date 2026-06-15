"use client";

import {
	type QuestionCardInput,
	questionCardInputSchema,
	type TriviaCardFormat,
} from "@packages/contracts";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	Button,
	Sheet,
	SheetIconButton,
	TriviaCard,
	type TriviaCardItem,
} from "@/components";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import styles from "./QuestionCardEditor.module.css";
import QuestionCardSettings from "./QuestionCardSettings";
import {
	addEntryToQuestionCard,
	changeQuestionCardFormat,
	removeEntryFromQuestionCard,
} from "./questionCardDraft";

type QuestionCardEditorProps = {
	cancelHref: string;
	initialValue: QuestionCardInput;
	isSubmitting: boolean;
	mode: "create" | "edit";
	onSubmit: (value: QuestionCardInput) => void;
	submitError?: string;
};

type MultipleChoiceQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "MULTIPLE_CHOICE" }
>;

const questionTypeLabels: Record<TriviaCardFormat, string> = {
	MULTIPLE_CHOICE: "Multiple choice",
	TRUE_OR_FALSE: "True or false",
	OPEN_ENDED: "Open ended",
	ORDER_ITEMS: "Order items",
};

const formatIssuePath = (path: ReadonlyArray<PropertyKey>) => {
	if (path.length === 0) {
		return "Question";
	}

	return path
		.map((segment) =>
			typeof segment === "number" ? String(segment + 1) : String(segment),
		)
		.join(" -> ");
};

const pathStartsWith = (
	path: ReadonlyArray<PropertyKey>,
	prefix: Array<string | number>,
) => prefix.every((segment, index) => path[index] === segment);

const cx = (...classNames: Array<string | false | undefined>) =>
	classNames.filter(Boolean).join(" ");

export default function QuestionCardEditor({
	cancelHref,
	initialValue,
	isSubmitting,
	mode,
	onSubmit,
	submitError,
}: QuestionCardEditorProps) {
	const [card, setCard] = useState<QuestionCardInput>(initialValue);
	const [showValidation, setShowValidation] = useState(false);
	const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(
		null,
	);
	const [openSheet, setOpenSheet] = useState<"card" | "entry" | null>(null);

	useEffect(() => {
		setCard(initialValue);
		setShowValidation(false);
		setSelectedEntryIndex(null);
		setOpenSheet(null);
	}, [initialValue]);

	useEffect(() => {
		if (card.format !== "MULTIPLE_CHOICE") {
			setOpenSheet(null);
		}
	}, [card.format]);

	useEffect(() => {
		if (
			selectedEntryIndex === null ||
			selectedEntryIndex < card.entries.length
		) {
			return;
		}

		setSelectedEntryIndex(card.entries.length - 1);
	}, [card.entries.length, selectedEntryIndex]);

	useEffect(() => {
		const goToNextEntry = () => {
			setSelectedEntryIndex((current) =>
				current === null ? 0 : (current + 1) % card.entries.length,
			);
			setOpenSheet("entry");
		};

		const goToPreviousEntry = () => {
			setSelectedEntryIndex((current) =>
				current === null
					? 0
					: (current - 1 + card.entries.length) % card.entries.length,
			);
			setOpenSheet("entry");
		};

		window.addEventListener(
			"question-editor-next-entry",
			goToNextEntry as EventListener,
		);
		window.addEventListener(
			"question-editor-previous-entry",
			goToPreviousEntry as EventListener,
		);

		return () => {
			window.removeEventListener(
				"question-editor-next-entry",
				goToNextEntry as EventListener,
			);
			window.removeEventListener(
				"question-editor-previous-entry",
				goToPreviousEntry as EventListener,
			);
		};
	}, [card.entries.length]);

	const validationResult = useMemo(
		() => questionCardInputSchema.safeParse(card),
		[card],
	);

	const validationIssues =
		showValidation && !validationResult.success
			? validationResult.error.issues
			: [];

	const validationMessages = validationIssues.map((issue) => {
		const path = formatIssuePath(issue.path);
		return `${path}: ${issue.message}`;
	});

	const getFieldError = (...prefix: Array<string | number>) =>
		validationIssues.find((issue) => pathStartsWith(issue.path, prefix))
			?.message;

	const hasUnsavedChanges =
		JSON.stringify(card) !== JSON.stringify(initialValue);
	const summaryTone = validationResult.success ? "valid" : "invalid";

	const handleSubmit = () => {
		setShowValidation(true);

		if (!validationResult.success) {
			return;
		}

		onSubmit(validationResult.data);
	};

	const resetDraft = () => {
		setCard(initialValue);
		setShowValidation(false);
		setSelectedEntryIndex(null);
		setOpenSheet(null);
	};

	const updateEntryText = (entryIndex: number, value: string) => {
		setCard((current) =>
			current.format === "MULTIPLE_CHOICE"
				? {
						...current,
						entries: current.entries.map((entry, currentIndex) =>
							currentIndex === entryIndex ? { ...entry, text: value } : entry,
						),
					}
				: current,
		);
	};

	const updateEntryExplanation = (entryIndex: number, value: string) => {
		const explanation = value || undefined;

		setCard((current) =>
			current.format === "MULTIPLE_CHOICE"
				? {
						...current,
						entries: current.entries.map((entry, currentIndex) =>
							currentIndex === entryIndex ? { ...entry, explanation } : entry,
						),
					}
				: current,
		);
	};

	if (card.format !== "MULTIPLE_CHOICE") {
		throw new Error(
			`Unsupported question format in wheel editor: ${card.format}`,
		);
	}

	const multipleChoiceCard = card as MultipleChoiceQuestionCardInput;

	const wheelItems = multipleChoiceCard.entries.map(
		(entry, entryIndex) =>
			({
				id: String(entryIndex),
				label: entry.text.trim() || `Entry ${entryIndex + 1}`,
				answer: entry.answer.trim() || "Pick answer",
			}) satisfies TriviaCardItem,
	);

	const validationCount = validationResult.success
		? 0
		: validationResult.error.issues.length;
	const promptLabel = multipleChoiceCard.prompt.trim() || "Set up card";
	const selectedEntry =
		selectedEntryIndex === null
			? null
			: (multipleChoiceCard.entries[selectedEntryIndex] ?? null);

	return (
		<section className={styles.panel} aria-labelledby="question-editor-title">
			<div className={styles.header}>
				<div>
					<h1 id="question-editor-title">
						{mode === "create" ? "Create question" : "Edit question"}
					</h1>
					<p>
						Use the card like a canvas: click the center for card settings and
						click entries around the wheel to edit them.
					</p>
				</div>
				<div className={styles.headerActions}>
					<Button
						disabled={isSubmitting || multipleChoiceCard.entries.length >= 10}
						onClick={() => {
							let nextEntryIndex: number | null = null;

							setCard((current) => {
								const nextCard = addEntryToQuestionCard(current);
								nextEntryIndex =
									nextCard.entries.length > current.entries.length
										? nextCard.entries.length - 1
										: null;
								return nextCard;
							});

							if (nextEntryIndex !== null) {
								setSelectedEntryIndex(nextEntryIndex);
								setOpenSheet("entry");
							}
						}}
						size="sm"
						variant="secondary"
					>
						Add entry
					</Button>
					<Button
						onClick={() => setOpenSheet("card")}
						size="sm"
						variant="ghost"
					>
						Card settings
					</Button>
				</div>
			</div>

			<div className={styles.summaryStrip}>
				<div className={styles.summaryMeta}>
					<span className={styles.summaryChip}>
						{questionTypeLabels[card.format]}
					</span>
					<span className={styles.summaryChip}>{card.difficulty}</span>
					<span className={styles.summaryChip}>
						{card.entries.length} / 10 entries
					</span>
					<span className={styles.summaryChip}>
						{multipleChoiceCard.choices.length} choices
					</span>
					<span
						className={cx(
							styles.summaryChip,
							summaryTone === "valid"
								? styles.summaryChipValid
								: styles.summaryChipInvalid,
						)}
					>
						{validationCount === 0
							? "Ready to save"
							: `${validationCount} issue${validationCount === 1 ? "" : "s"}`}
					</span>
					{card.tags.length ? (
						card.tags.map((tag, tagIndex) => (
							<span className={styles.summaryTag} key={`${tag}-${tagIndex}`}>
								#{tag || "tag"}
							</span>
						))
					) : (
						<span className={styles.summaryMuted}>No tags yet</span>
					)}
				</div>

				<div className={styles.summaryHints}>
					{!multipleChoiceCard.prompt.trim() ? (
						<p>Add a prompt from the card center.</p>
					) : null}
					{multipleChoiceCard.choices.some((choice) => !choice.trim()) ? (
						<p>Finish your shared choice list in an entry editor.</p>
					) : null}
					{hasUnsavedChanges ? (
						<p>Draft has unsaved changes.</p>
					) : (
						<p>Draft matches the last loaded state.</p>
					)}
				</div>
			</div>

			<div className={styles.canvas}>
				<TriviaCard
					centerHint="Card settings"
					items={wheelItems}
					onCenterClick={() => setOpenSheet("card")}
					onSelectedItemChange={(itemId) => {
						if (itemId === null) {
							setOpenSheet(null);
							return;
						}

						setSelectedEntryIndex(Number(itemId));
						setOpenSheet("entry");
					}}
					prompt={promptLabel}
					selectedItemId={
						openSheet === "entry" && selectedEntryIndex !== null
							? String(selectedEntryIndex)
							: null
					}
				/>
			</div>

			{validationMessages.length > 0 ? (
				<div className={styles.validationSummary}>
					<p>Fix these issues before saving:</p>
					<ul>
						{validationMessages.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</div>
			) : null}

			{submitError ? (
				<p className={styles.errorMessage}>{submitError}</p>
			) : null}

			<div className={styles.actions}>
				<Button disabled={isSubmitting} onClick={handleSubmit}>
					{mode === "create" ? "Create question" : "Save changes"}
				</Button>
				<Button
					disabled={isSubmitting || !hasUnsavedChanges}
					onClick={resetDraft}
					variant="secondary"
				>
					Reset
				</Button>
				<Link className={styles.secondaryLink} href={cancelHref}>
					Cancel
				</Link>
			</div>

			<Sheet
				content={
					openSheet === "card" ? (
						<QuestionCardSettings
							card={multipleChoiceCard}
							getFieldError={getFieldError}
							isSubmitting={isSubmitting}
							onAddChoice={() =>
								setCard((current) =>
									current.format === "MULTIPLE_CHOICE"
										? { ...current, choices: [...current.choices, ""] }
										: current,
								)
							}
							onAddTag={() =>
								setCard((current) => ({
									...current,
									tags: [...current.tags, ""],
								}))
							}
							onChoiceChange={(choiceIndex, value) =>
								setCard((current) =>
									current.format === "MULTIPLE_CHOICE"
										? {
												...current,
												choices: current.choices.map((choice, currentIndex) =>
													currentIndex === choiceIndex ? value : choice,
												),
											}
										: current,
								)
							}
							onDifficultyChange={(difficulty) =>
								setCard((current) => ({ ...current, difficulty }))
							}
							onFormatChange={(format) =>
								setCard((current) => changeQuestionCardFormat(current, format))
							}
							onPromptChange={(prompt) =>
								setCard((current) => ({ ...current, prompt }))
							}
							onRemoveChoice={(choiceIndex) =>
								setCard((current) => {
									if (current.format !== "MULTIPLE_CHOICE") {
										return current;
									}

									const removedChoice = current.choices[choiceIndex];
									const nextChoices = current.choices.filter(
										(_, currentIndex) => currentIndex !== choiceIndex,
									);

									return {
										...current,
										choices: nextChoices,
										entries: current.entries.map((entry) => ({
											...entry,
											answer:
												entry.answer === removedChoice ? "" : entry.answer,
										})),
									};
								})
							}
							onRemoveTag={(tagIndex) =>
								setCard((current) => ({
									...current,
									tags: current.tags.filter(
										(_, currentIndex) => currentIndex !== tagIndex,
									),
								}))
							}
							onTagChange={(tagIndex, value) =>
								setCard((current) => ({
									...current,
									tags: current.tags.map((tag, currentIndex) =>
										currentIndex === tagIndex ? value : tag,
									),
								}))
							}
						/>
					) : selectedEntryIndex !== null && selectedEntry ? (
						<MultipleChoiceEditor
							card={multipleChoiceCard}
							entryIndex={selectedEntryIndex}
							getFieldError={getFieldError}
							isSubmitting={isSubmitting}
							onEntryAnswerChange={(entryIndex, answer) =>
								setCard((current) =>
									current.format === "MULTIPLE_CHOICE"
										? {
												...current,
												entries: current.entries.map((entry, currentIndex) =>
													currentIndex === entryIndex
														? { ...entry, answer }
														: entry,
												),
											}
										: current,
								)
							}
							onEntryExplanationChange={updateEntryExplanation}
							onEntryTextChange={updateEntryText}
							open={openSheet === "entry"}
						/>
					) : null
				}
				footer={
					openSheet === "card" ? (
						<div className={styles.sheetFooterCenter}>
							<Button
								disabled={card.entries.length === 0}
								onClick={() => {
									setSelectedEntryIndex((current) => current ?? 0);
									setOpenSheet("entry");
								}}
								size="sm"
								variant="secondary"
							>
								Entries
							</Button>
						</div>
					) : openSheet === "entry" ? (
						<div className={styles.sheetFooterSpread}>
							<SheetIconButton
								aria-label="Previous entry"
								icon={<ArrowLeft size={18} strokeWidth={2.4} />}
								label="Previous entry"
								onClick={() => {
									setSelectedEntryIndex((current) =>
										current === null
											? 0
											: (current - 1 + multipleChoiceCard.entries.length) %
												multipleChoiceCard.entries.length,
									);
								}}
							/>
							<Button
								onClick={() => setOpenSheet("card")}
								size="sm"
								variant="secondary"
							>
								Settings
							</Button>
							<SheetIconButton
								aria-label="Next entry"
								icon={<ArrowRight size={18} strokeWidth={2.4} />}
								label="Next entry"
								onClick={() => {
									setSelectedEntryIndex((current) =>
										current === null
											? 0
											: (current + 1) % multipleChoiceCard.entries.length,
									);
								}}
							/>
						</div>
					) : undefined
				}
				leadingIcon={
					openSheet === "entry" && selectedEntryIndex !== null ? (
						<SheetIconButton
							aria-label="Delete entry"
							disabled={isSubmitting || card.entries.length <= 2}
							icon={<Trash2 size={18} strokeWidth={2.2} />}
							label="Delete entry"
							onClick={() => {
								setCard((current) =>
									removeEntryFromQuestionCard(current, selectedEntryIndex),
								);
								setSelectedEntryIndex((current) => {
									if (current === null) {
										return null;
									}

									if (multipleChoiceCard.entries.length <= 2) {
										return current;
									}

									return Math.max(
										0,
										Math.min(current - 1, selectedEntryIndex - 1),
									);
								});
								setOpenSheet(null);
							}}
							variant="danger"
						/>
					) : undefined
				}
				open={openSheet !== null}
				setOpen={(open) => {
					if (!open) {
						setOpenSheet(null);
					}
				}}
				title={
					openSheet === "card"
						? "Card settings"
						: selectedEntryIndex !== null
							? `Edit entry ${selectedEntryIndex + 1}`
							: ""
				}
			/>
		</section>
	);
}
