"use client";

import {
	MAX_MULTIPLE_CHOICE_CHOICES,
	MAX_TAGS_PER_CARD,
	type QuestionCardInput,
	questionCardInputSchema,
} from "@packages/contracts";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	Sheet,
	SheetIconButton,
	TriviaCard,
	type TriviaCardItem,
} from "@/components";
import MultipleChoiceEditor from "./MultipleChoiceEditor";
import OpenEndedEditor from "./OpenEndedEditor";
import OrderItemsEditor from "./OrderItemsEditor";
import QuestionCardSettings from "./QuestionCardSettings";
import {
	addChoiceToQuestionCard,
	addEntryToQuestionCard,
	addTagToQuestionCard,
	changeQuestionCardFormat,
	removeEntryFromQuestionCard,
	updateOpenEndedQuestionCardUiHint,
} from "./questionCardDraft";
import TrueOrFalseEditor from "./TrueOrFalseEditor";

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
type TrueOrFalseQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "TRUE_OR_FALSE" }
>;
type OpenEndedQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "OPEN_ENDED" }
>;
type OrderItemsQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "ORDER_ITEMS" }
>;

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

const formatEntryAnswer = (
	card: QuestionCardInput,
	entry: QuestionCardInput["entries"][number],
) => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return (entry as TrueOrFalseQuestionCardInput["entries"][number]).answer
				? "True"
				: "False";
		case "OPEN_ENDED": {
			const openEndedEntry =
				entry as OpenEndedQuestionCardInput["entries"][number];
			const firstAnswer = openEndedEntry.answer[0]?.trim();
			const remainingAnswers = Math.max(openEndedEntry.answer.length - 1, 0);
			if (!firstAnswer) {
				return "Set answer";
			}

			return remainingAnswers > 0
				? `${firstAnswer} +${remainingAnswers}`
				: firstAnswer;
		}
		case "ORDER_ITEMS":
			return `#${(entry as OrderItemsQuestionCardInput["entries"][number]).answer}`;
		case "MULTIPLE_CHOICE":
		default:
			return (
				(
					entry as MultipleChoiceQuestionCardInput["entries"][number]
				).answer.trim() || "Pick answer"
			);
	}
};

const updateEntryAtIndex = (
	card: QuestionCardInput,
	entryIndex: number,
	updater: (
		entry: QuestionCardInput["entries"][number],
	) => QuestionCardInput["entries"][number],
): QuestionCardInput => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				...card,
				entries: card.entries.map((entry, currentIndex) =>
					currentIndex === entryIndex
						? (updater(
								entry,
							) as TrueOrFalseQuestionCardInput["entries"][number])
						: entry,
				),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				...card,
				entries: card.entries.map((entry, currentIndex) =>
					currentIndex === entryIndex
						? (updater(entry) as OpenEndedQuestionCardInput["entries"][number])
						: entry,
				),
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				...card,
				entries: card.entries.map((entry, currentIndex) =>
					currentIndex === entryIndex
						? (updater(entry) as OrderItemsQuestionCardInput["entries"][number])
						: entry,
				),
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				...card,
				entries: card.entries.map((entry, currentIndex) =>
					currentIndex === entryIndex
						? (updater(
								entry,
							) as MultipleChoiceQuestionCardInput["entries"][number])
						: entry,
				),
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

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
			updateEntryAtIndex(current, entryIndex, (entry) => ({
				...entry,
				text: value,
			})),
		);
	};

	const wheelItems = card.entries.map(
		(entry, entryIndex) =>
			({
				id: String(entryIndex),
				label: entry.text.trim() || `Entry ${entryIndex + 1}`,
				answer: formatEntryAnswer(card, entry),
				answerUiHint:
					card.format === "OPEN_ENDED" && card.uiHint === "country"
						? ("country" as const)
						: undefined,
			}) satisfies TriviaCardItem,
	);

	const promptLabel = card.prompt.trim() || "Set up card";
	const selectedEntry =
		selectedEntryIndex === null
			? null
			: (card.entries[selectedEntryIndex] ?? null);

	const entryEditor =
		selectedEntryIndex !== null && selectedEntry ? (
			card.format === "MULTIPLE_CHOICE" ? (
				<MultipleChoiceEditor
					card={card}
					entryIndex={selectedEntryIndex}
					getFieldError={getFieldError}
					isSubmitting={isSubmitting}
					onEntryAnswerChange={(entryIndex, answer) =>
						setCard((current) =>
							current.format === "MULTIPLE_CHOICE"
								? updateEntryAtIndex(current, entryIndex, (entry) => ({
										...entry,
										answer,
									}))
								: current,
						)
					}
					onEntryTextChange={updateEntryText}
					open={openSheet === "entry"}
				/>
			) : card.format === "TRUE_OR_FALSE" ? (
				<TrueOrFalseEditor
					card={card}
					entryIndex={selectedEntryIndex}
					getFieldError={getFieldError}
					isSubmitting={isSubmitting}
					onEntryAnswerChange={(entryIndex, answer) =>
						setCard((current) =>
							current.format === "TRUE_OR_FALSE"
								? updateEntryAtIndex(current, entryIndex, (entry) => ({
										...entry,
										answer,
									}))
								: current,
						)
					}
					onEntryTextChange={updateEntryText}
					open={openSheet === "entry"}
				/>
			) : card.format === "ORDER_ITEMS" ? (
				<OrderItemsEditor
					card={card}
					entryIndex={selectedEntryIndex}
					getFieldError={getFieldError}
					isSubmitting={isSubmitting}
					onEntryAnswerChange={(entryIndex, answer) =>
						setCard((current) =>
							current.format === "ORDER_ITEMS"
								? updateEntryAtIndex(current, entryIndex, (entry) => ({
										...entry,
										answer,
									}))
								: current,
						)
					}
					onEntryTextChange={updateEntryText}
					open={openSheet === "entry"}
				/>
			) : (
				<OpenEndedEditor
					card={card}
					entryIndex={selectedEntryIndex}
					getFieldError={getFieldError}
					isSubmitting={isSubmitting}
					onAddAcceptedAnswer={(entryIndex) =>
						setCard((current) =>
							current.format === "OPEN_ENDED"
								? updateEntryAtIndex(current, entryIndex, (entry) => {
										const openEndedEntry =
											entry as OpenEndedQuestionCardInput["entries"][number];

										return {
											...openEndedEntry,
											answer: [...openEndedEntry.answer, ""],
										};
									})
								: current,
						)
					}
					onEntryAcceptedAnswerChange={(entryIndex, answerIndex, value) =>
						setCard((current) =>
							current.format === "OPEN_ENDED"
								? updateEntryAtIndex(current, entryIndex, (entry) => {
										const openEndedEntry =
											entry as OpenEndedQuestionCardInput["entries"][number];

										return {
											...openEndedEntry,
											answer: openEndedEntry.answer.map(
												(answer, currentIndex) =>
													currentIndex === answerIndex ? value : answer,
											),
										};
									})
								: current,
						)
					}
					onEntryTextChange={updateEntryText}
					onRemoveAcceptedAnswer={(entryIndex, answerIndex) =>
						setCard((current) => {
							if (current.format !== "OPEN_ENDED") {
								return current;
							}

							const answerCount =
								current.entries[entryIndex]?.answer.length ?? 0;
							if (answerCount <= 1) {
								return current;
							}

							return updateEntryAtIndex(current, entryIndex, (entry) => {
								const openEndedEntry =
									entry as OpenEndedQuestionCardInput["entries"][number];

								return {
									...openEndedEntry,
									answer: openEndedEntry.answer.filter(
										(_, currentIndex) => currentIndex !== answerIndex,
									),
								};
							});
						})
					}
					open={openSheet === "entry"}
				/>
			)
		) : null;

	return (
		<section
			className="grid w-full max-w-5xl gap-6"
			aria-labelledby="question-editor-title"
		>
			<div>
				<div>
					<h1
						id="question-editor-title"
						className="text-3xl leading-tight font-bold"
					>
						{mode === "create" ? "Create question" : "Edit question"}
					</h1>
				</div>
			</div>
			<div className="py-2 sm:py-4">
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
				<div className="alert alert-error alert-soft grid gap-2">
					<p>Fix these issues before saving:</p>
					<ul>
						{validationMessages.map((message) => (
							<li key={message}>{message}</li>
						))}
					</ul>
				</div>
			) : null}

			{submitError ? (
				<p className="text-error font-semibold">{submitError}</p>
			) : null}

			<div className="flex flex-wrap items-center gap-3">
				<button
					className="btn btn-primary"
					disabled={isSubmitting}
					onClick={handleSubmit}
					type="button"
				>
					{mode === "create" ? "Create question" : "Save changes"}
				</button>
				<button
					className="btn"
					disabled={isSubmitting || !hasUnsavedChanges}
					onClick={resetDraft}
					type="button"
				>
					Reset
				</button>
				<Link className="btn" href={cancelHref}>
					Cancel
				</Link>
			</div>

			<Sheet
				content={
					openSheet === "card" ? (
						<QuestionCardSettings
							card={card}
							canAddChoice={
								card.format === "MULTIPLE_CHOICE" &&
								card.choices.length < MAX_MULTIPLE_CHOICE_CHOICES
							}
							canAddTag={card.tags.length < MAX_TAGS_PER_CARD}
							getFieldError={getFieldError}
							isSubmitting={isSubmitting}
							onAddChoice={() =>
								setCard((current) =>
									current.format === "MULTIPLE_CHOICE"
										? addChoiceToQuestionCard(current)
										: current,
								)
							}
							onAddTag={() =>
								setCard((current) => addTagToQuestionCard(current))
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
							onUiHintChange={(uiHint) =>
								setCard((current) =>
									current.format === "OPEN_ENDED"
										? updateOpenEndedQuestionCardUiHint(current, uiHint)
										: current,
								)
							}
						/>
					) : (
						entryEditor
					)
				}
				footer={
					openSheet === "card" ? (
						<div className="flex w-full flex-wrap justify-center gap-3">
							<button
								className="btn btn-sm"
								disabled={isSubmitting || card.entries.length >= 10}
								onClick={() =>
									setCard((current) => addEntryToQuestionCard(current))
								}
								type="button"
							>
								Add entry
							</button>
							<button
								className="btn btn-sm"
								disabled={card.entries.length === 0}
								onClick={() => {
									setSelectedEntryIndex((current) => current ?? 0);
									setOpenSheet("entry");
								}}
								type="button"
							>
								Entries
							</button>
						</div>
					) : openSheet === "entry" ? (
						<div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
							<SheetIconButton
								aria-label="Previous entry"
								icon={<ArrowLeft size={18} strokeWidth={2.4} />}
								label="Previous entry"
								onClick={() => {
									setSelectedEntryIndex((current) =>
										current === null
											? 0
											: (current - 1 + card.entries.length) %
												card.entries.length,
									);
								}}
							/>
							<button
								className="btn btn-sm justify-self-center"
								onClick={() => setOpenSheet("card")}
								type="button"
							>
								Settings
							</button>
							<SheetIconButton
								aria-label="Next entry"
								icon={<ArrowRight size={18} strokeWidth={2.4} />}
								label="Next entry"
								onClick={() => {
									setSelectedEntryIndex((current) =>
										current === null ? 0 : (current + 1) % card.entries.length,
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

									if (card.entries.length <= 2) {
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
