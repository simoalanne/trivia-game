"use client";

import {
	type QuestionCardInput,
	questionCardInputSchema,
	type TriviaCardFormat,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
} from "@packages/contracts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Field, Select, TextInput } from "@/components";
import styles from "./QuestionForm.module.css";
import {
	addEntryToQuestionCard,
	changeQuestionCardFormat,
	removeEntryFromQuestionCard,
} from "./questionFormData";

type QuestionFormProps = {
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

export default function QuestionForm({
	cancelHref,
	initialValue,
	isSubmitting,
	mode,
	onSubmit,
	submitError,
}: QuestionFormProps) {
	const [card, setCard] = useState<QuestionCardInput>(initialValue);
	const [showValidation, setShowValidation] = useState(false);

	useEffect(() => {
		setCard(initialValue);
		setShowValidation(false);
	}, [initialValue]);

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

	const handleSubmit = () => {
		setShowValidation(true);

		if (!validationResult.success) {
			return;
		}

		onSubmit(validationResult.data);
	};

	const updateEntryText = (entryIndex: number, value: string) => {
		setCard((current) => {
			switch (current.format) {
				case "TRUE_OR_FALSE":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, text: value }
								: currentEntry,
						),
					} satisfies TrueOrFalseQuestionCardInput;
				case "OPEN_ENDED":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, text: value }
								: currentEntry,
						),
					} satisfies OpenEndedQuestionCardInput;
				case "ORDER_ITEMS":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, text: value }
								: currentEntry,
						),
					} satisfies OrderItemsQuestionCardInput;
				case "MULTIPLE_CHOICE":
				default:
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, text: value }
								: currentEntry,
						),
					} satisfies MultipleChoiceQuestionCardInput;
			}
		});
	};

	const updateEntryExplanation = (entryIndex: number, value: string) => {
		const explanation = value || undefined;

		setCard((current) => {
			switch (current.format) {
				case "TRUE_OR_FALSE":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, explanation }
								: currentEntry,
						),
					} satisfies TrueOrFalseQuestionCardInput;
				case "OPEN_ENDED":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, explanation }
								: currentEntry,
						),
					} satisfies OpenEndedQuestionCardInput;
				case "ORDER_ITEMS":
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, explanation }
								: currentEntry,
						),
					} satisfies OrderItemsQuestionCardInput;
				case "MULTIPLE_CHOICE":
				default:
					return {
						...current,
						entries: current.entries.map((currentEntry, currentIndex) =>
							currentIndex === entryIndex
								? { ...currentEntry, explanation }
								: currentEntry,
						),
					} satisfies MultipleChoiceQuestionCardInput;
			}
		});
	};

	return (
		<section className={styles.panel} aria-labelledby="question-form-title">
			<div className={styles.header}>
				<h1 id="question-form-title">
					{mode === "create" ? "Create question" : "Edit question"}
				</h1>
			</div>

			<div className={styles.form}>
				<Field error={getFieldError("prompt")} htmlFor="prompt" label="Prompt">
					<textarea
						className={`${styles.textarea} ${
							getFieldError("prompt") ? styles.textareaInvalid : ""
						}`}
						id="prompt"
						onChange={(event) =>
							setCard((current) => ({
								...current,
								prompt: event.target.value,
							}))
						}
						placeholder="What should players solve?"
						rows={4}
						value={card.prompt}
					/>
				</Field>

				<div className={styles.inlineFields}>
					<Field
						error={getFieldError("difficulty")}
						htmlFor="difficulty"
						label="Difficulty"
					>
						<Select
							id="difficulty"
							invalid={Boolean(getFieldError("difficulty"))}
							onChange={(event) =>
								setCard((current) => ({
									...current,
									difficulty: event.target
										.value as QuestionCardInput["difficulty"],
								}))
							}
							value={card.difficulty}
						>
							{triviaCardDifficultySchema.options.map((difficulty) => (
								<option key={difficulty} value={difficulty}>
									{difficulty}
								</option>
							))}
						</Select>
					</Field>

					<Field
						error={getFieldError("format")}
						htmlFor="format"
						label="Question type"
					>
						<Select
							id="format"
							invalid={Boolean(getFieldError("format"))}
							onChange={(event) =>
								setCard((current) =>
									changeQuestionCardFormat(
										current,
										event.target.value as TriviaCardFormat,
									),
								)
							}
							value={card.format}
						>
							{triviaCardFormatSchema.options.map((format) => (
								<option key={format} value={format}>
									{questionTypeLabels[format]}
								</option>
							))}
						</Select>
					</Field>
				</div>

				<Field
					description="Tags are optional but must be unique when provided."
					error={getFieldError("tags")}
					label="Tags"
				>
					<div className={styles.listEditor}>
						{card.tags.map((tag, tagIndex) => (
							<div className={styles.rowEditor} key={tag}>
								<TextInput
									invalid={Boolean(getFieldError("tags", tagIndex))}
									onChange={(event) =>
										setCard((current) => ({
											...current,
											tags: current.tags.map((currentTag, currentIndex) =>
												currentIndex === tagIndex
													? event.target.value
													: currentTag,
											),
										}))
									}
									placeholder="Category tag"
									value={tag}
								/>
								<Button
									disabled={isSubmitting}
									onClick={() =>
										setCard((current) => ({
											...current,
											tags: current.tags.filter(
												(_, currentIndex) => currentIndex !== tagIndex,
											),
										}))
									}
									size="sm"
									variant="ghost"
								>
									Remove
								</Button>
							</div>
						))}
						<Button
							disabled={isSubmitting}
							onClick={() =>
								setCard((current) => ({
									...current,
									tags: [...current.tags, ""],
								}))
							}
							size="sm"
							variant="secondary"
						>
							Add tag
						</Button>
					</div>
				</Field>

				{card.format === "MULTIPLE_CHOICE" ? (
					<Field
						description="Every choice must be unique, and each entry answer must match one of them."
						error={getFieldError("choices")}
						label="Choices"
					>
						<div className={styles.listEditor}>
							{card.choices.map((choice, choiceIndex) => (
								<div className={styles.rowEditor} key={`choice-${choiceIndex}`}>
									<TextInput
										invalid={Boolean(getFieldError("choices", choiceIndex))}
										onChange={(event) =>
											setCard((current) => {
												if (current.format !== "MULTIPLE_CHOICE") {
													return current;
												}

												const nextChoices = current.choices.map(
													(currentChoice, currentIndex) =>
														currentIndex === choiceIndex
															? event.target.value
															: currentChoice,
												);

												return {
													...current,
													choices: nextChoices,
												} satisfies MultipleChoiceQuestionCardInput;
											})
										}
										placeholder={`Choice ${choiceIndex + 1}`}
										value={choice}
									/>
									<Button
										disabled={isSubmitting || card.choices.length <= 2}
										onClick={() =>
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
															entry.answer === removedChoice
																? ""
																: entry.answer,
													})),
												} satisfies MultipleChoiceQuestionCardInput;
											})
										}
										size="sm"
										variant="ghost"
									>
										Remove
									</Button>
								</div>
							))}
							<Button
								disabled={isSubmitting}
								onClick={() =>
									setCard((current) =>
										current.format === "MULTIPLE_CHOICE"
											? ({
													...current,
													choices: [...current.choices, ""],
												} satisfies MultipleChoiceQuestionCardInput)
											: current,
									)
								}
								size="sm"
								variant="secondary"
							>
								Add choice
							</Button>
						</div>
					</Field>
				) : null}

				<section
					className={styles.entriesSection}
					aria-label="Question entries"
				>
					<div className={styles.sectionHeader}>
						<div>
							<h2>Entries</h2>
							<p>Each card needs between 2 and 10 entries.</p>
						</div>
						<Button
							disabled={isSubmitting || card.entries.length >= 10}
							onClick={() =>
								setCard((current) => addEntryToQuestionCard(current))
							}
							size="sm"
							variant="secondary"
						>
							Add entry
						</Button>
					</div>

					<div className={styles.entriesGrid}>
						{card.entries.map((entry, entryIndex) => (
							<article className={styles.entryCard} key={`entry-${entryIndex}`}>
								<div className={styles.entryHeader}>
									<h3>Entry {entryIndex + 1}</h3>
									<Button
										disabled={isSubmitting || card.entries.length <= 2}
										onClick={() =>
											setCard((current) =>
												removeEntryFromQuestionCard(current, entryIndex),
											)
										}
										size="sm"
										variant="ghost"
									>
										Remove
									</Button>
								</div>

								<Field
									error={getFieldError("entries", entryIndex, "text")}
									label="Entry text"
								>
									<TextInput
										invalid={Boolean(
											getFieldError("entries", entryIndex, "text"),
										)}
										onChange={(event) =>
											updateEntryText(entryIndex, event.target.value)
										}
										placeholder="What players see for this slot"
										value={entry.text}
									/>
								</Field>

								<Field
									error={getFieldError("entries", entryIndex, "explanation")}
									label="Explanation"
								>
									<TextInput
										invalid={Boolean(
											getFieldError("entries", entryIndex, "explanation"),
										)}
										onChange={(event) =>
											updateEntryExplanation(entryIndex, event.target.value)
										}
										placeholder="Optional explanation shown after answering"
										value={entry.explanation ?? ""}
									/>
								</Field>

								{card.format === "MULTIPLE_CHOICE" ? (
									<Field
										error={getFieldError("entries", entryIndex, "answer")}
										label="Correct choice"
									>
										<Select
											invalid={Boolean(
												getFieldError("entries", entryIndex, "answer"),
											)}
											onChange={(event) =>
												setCard((current) =>
													current.format === "MULTIPLE_CHOICE"
														? ({
																...current,
																entries: current.entries.map(
																	(currentEntry, currentIndex) =>
																		currentIndex === entryIndex
																			? {
																					...currentEntry,
																					answer: event.target.value,
																				}
																			: currentEntry,
																),
															} satisfies MultipleChoiceQuestionCardInput)
														: current,
												)
											}
											value={
												(
													entry as MultipleChoiceQuestionCardInput["entries"][number]
												).answer
											}
										>
											<option value="">Select answer</option>
											{card.choices.map((choice, choiceIndex) => (
												<option
													key={`choice-option-${choiceIndex}`}
													value={choice}
												>
													{choice || `Choice ${choiceIndex + 1}`}
												</option>
											))}
										</Select>
									</Field>
								) : null}

								{card.format === "TRUE_OR_FALSE" ? (
									<Field label="Correct answer">
										<Select
											onChange={(event) =>
												setCard((current) =>
													current.format === "TRUE_OR_FALSE"
														? ({
																...current,
																entries: current.entries.map(
																	(currentEntry, currentIndex) =>
																		currentIndex === entryIndex
																			? {
																					...currentEntry,
																					answer: event.target.value === "true",
																				}
																			: currentEntry,
																),
															} satisfies TrueOrFalseQuestionCardInput)
														: current,
												)
											}
											value={String(
												(
													entry as TrueOrFalseQuestionCardInput["entries"][number]
												).answer,
											)}
										>
											<option value="true">True</option>
											<option value="false">False</option>
										</Select>
									</Field>
								) : null}

								{card.format === "ORDER_ITEMS" ? (
									<Field
										error={getFieldError("entries", entryIndex, "answer")}
										label="Correct position"
									>
										<Select
											invalid={Boolean(
												getFieldError("entries", entryIndex, "answer"),
											)}
											onChange={(event) =>
												setCard((current) =>
													current.format === "ORDER_ITEMS"
														? ({
																...current,
																entries: current.entries.map(
																	(currentEntry, currentIndex) =>
																		currentIndex === entryIndex
																			? {
																					...currentEntry,
																					answer: Number(event.target.value),
																				}
																			: currentEntry,
																),
															} satisfies OrderItemsQuestionCardInput)
														: current,
												)
											}
											value={String(
												(
													entry as OrderItemsQuestionCardInput["entries"][number]
												).answer,
											)}
										>
											{Array.from(
												{ length: card.entries.length },
												(_, answerIndex) => answerIndex + 1,
											).map((option) => (
												<option key={`position-${option}`} value={option}>
													{option}
												</option>
											))}
										</Select>
									</Field>
								) : null}

								{card.format === "OPEN_ENDED" ? (
									<Field
										error={getFieldError("entries", entryIndex, "answer")}
										label="Accepted answers"
									>
										<div className={styles.listEditor}>
											{(
												entry as OpenEndedQuestionCardInput["entries"][number]
											).answer.map((answer, answerIndex) => (
												<div
													className={styles.rowEditor}
													key={`answer-${entryIndex}-${answerIndex}`}
												>
													<TextInput
														invalid={Boolean(
															getFieldError(
																"entries",
																entryIndex,
																"answer",
																answerIndex,
															),
														)}
														onChange={(event) =>
															setCard((current) =>
																current.format === "OPEN_ENDED"
																	? ({
																			...current,
																			entries: current.entries.map(
																				(currentEntry, currentIndex) =>
																					currentIndex === entryIndex
																						? {
																								...currentEntry,
																								answer: currentEntry.answer.map(
																									(
																										currentAnswer,
																										currentAnswerIndex,
																									) =>
																										currentAnswerIndex ===
																										answerIndex
																											? event.target.value
																											: currentAnswer,
																								),
																							}
																						: currentEntry,
																			),
																		} satisfies OpenEndedQuestionCardInput)
																	: current,
															)
														}
														placeholder="Accepted answer"
														value={answer}
													/>
													<Button
														disabled={
															isSubmitting ||
															(
																entry as OpenEndedQuestionCardInput["entries"][number]
															).answer.length <= 1
														}
														onClick={() =>
															setCard((current) =>
																current.format === "OPEN_ENDED"
																	? ({
																			...current,
																			entries: current.entries.map(
																				(currentEntry, currentIndex) =>
																					currentIndex === entryIndex
																						? {
																								...currentEntry,
																								answer:
																									currentEntry.answer.filter(
																										(_, currentAnswerIndex) =>
																											currentAnswerIndex !==
																											answerIndex,
																									),
																							}
																						: currentEntry,
																			),
																		} satisfies OpenEndedQuestionCardInput)
																	: current,
															)
														}
														size="sm"
														variant="ghost"
													>
														Remove
													</Button>
												</div>
											))}
											<Button
												disabled={isSubmitting}
												onClick={() =>
													setCard((current) =>
														current.format === "OPEN_ENDED"
															? ({
																	...current,
																	entries: current.entries.map(
																		(currentEntry, currentIndex) =>
																			currentIndex === entryIndex
																				? {
																						...currentEntry,
																						answer: [
																							...currentEntry.answer,
																							"",
																						],
																					}
																				: currentEntry,
																	),
																} satisfies OpenEndedQuestionCardInput)
															: current,
													)
												}
												size="sm"
												variant="secondary"
											>
												Add accepted answer
											</Button>
										</div>
									</Field>
								) : null}
							</article>
						))}
					</div>
				</section>

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
					<Button disabled={isSubmitting} onClick={handleSubmit} type="button">
						{mode === "create" ? "Create question" : "Save changes"}
					</Button>
					<Link className={styles.secondaryLink} href={cancelHref}>
						Cancel
					</Link>
				</div>
			</div>
		</section>
	);
}
