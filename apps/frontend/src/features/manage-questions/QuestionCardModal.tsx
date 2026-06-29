"use client";

import {
	MAX_MULTIPLE_CHOICE_CHOICES,
	type QuestionCard,
	type QuestionCardInput,
	questionCardInputSchema,
	type TriviaCardFormat,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
} from "@packages/contracts";
import { Plus, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountryPicker, Modal, TagInput } from "@/components";
import { useApiClient } from "@/lib/apiClientProvider";
import { cn } from "@/lib/utils";

type QuestionCardModalProps = {
	open: boolean;
	question?: QuestionCard | null;
	setOpen: (open: boolean) => void;
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

type LocalEntry<TEntry> = TEntry & { id: string };

type LocalMultipleChoiceForm = Omit<
	MultipleChoiceQuestionCardInput,
	"entries"
> & {
	entries: Array<
		LocalEntry<MultipleChoiceQuestionCardInput["entries"][number]>
	>;
};
type LocalTrueOrFalseForm = Omit<TrueOrFalseQuestionCardInput, "entries"> & {
	entries: Array<LocalEntry<TrueOrFalseQuestionCardInput["entries"][number]>>;
};
type LocalOpenEndedForm = Omit<OpenEndedQuestionCardInput, "entries"> & {
	entries: Array<LocalEntry<OpenEndedQuestionCardInput["entries"][number]>>;
};
type LocalOrderItemsForm = Omit<OrderItemsQuestionCardInput, "entries"> & {
	entries: Array<LocalEntry<OrderItemsQuestionCardInput["entries"][number]>>;
};

type LocalQuestionCardForm =
	| LocalMultipleChoiceForm
	| LocalTrueOrFalseForm
	| LocalOpenEndedForm
	| LocalOrderItemsForm;

type CreateQuestionCardOptions = {
	difficulty?: QuestionCardInput["difficulty"];
	entryCount?: number;
	format?: TriviaCardFormat;
	prompt?: string;
	tags?: string[];
	uiHint?: OpenEndedQuestionCardInput["uiHint"];
};

type ValidationIssue = {
	message: string;
	path: ReadonlyArray<PropertyKey>;
};

const MIN_ENTRY_COUNT = 2;
const MAX_ENTRY_COUNT = 10;
const DEFAULT_COUNTRY_CODE = "FI";
const GENERIC_SUBMIT_ERROR = "Failed to save question card. Please try again.";

const questionTypeLabels: Record<TriviaCardFormat, string> = {
	MULTIPLE_CHOICE: "Multiple choice",
	TRUE_OR_FALSE: "True or false",
	OPEN_ENDED: "Open ended",
	ORDER_ITEMS: "Order items",
};

const difficultyLabels: Record<QuestionCardInput["difficulty"], string> = {
	EASY: "Easy",
	MEDIUM: "Medium",
	HARD: "Hard",
};

const createLocalId = () => crypto.randomUUID();

const clampEntryCount = (value: number) =>
	Math.min(Math.max(value, MIN_ENTRY_COUNT), MAX_ENTRY_COUNT);

const createDefaultMultipleChoiceChoices = (count = MIN_ENTRY_COUNT) =>
	Array.from({ length: count }, (_, index) => `Choice ${index + 1}`);

const createQuestionCardInput = ({
	difficulty = "EASY",
	entryCount = MIN_ENTRY_COUNT,
	format = "MULTIPLE_CHOICE",
	prompt = "",
	tags = [],
	uiHint,
}: CreateQuestionCardOptions = {}): QuestionCardInput => {
	const normalizedEntryCount = clampEntryCount(entryCount);

	switch (format) {
		case "TRUE_OR_FALSE":
			return {
				difficulty,
				entries: Array.from({ length: normalizedEntryCount }, () => ({
					answer: true,
					text: "",
				})),
				format,
				prompt,
				tags,
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				difficulty,
				entries: Array.from({ length: normalizedEntryCount }, () => ({
					answer: [uiHint === "country" ? DEFAULT_COUNTRY_CODE : ""],
					text: "",
				})),
				format,
				prompt,
				tags,
				uiHint,
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				difficulty,
				entries: Array.from({ length: normalizedEntryCount }, (_, index) => ({
					answer: index + 1,
					text: "",
				})),
				format,
				prompt,
				tags,
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				choices: createDefaultMultipleChoiceChoices(),
				difficulty,
				entries: Array.from({ length: normalizedEntryCount }, () => ({
					answer: "",
					text: "",
				})),
				format: "MULTIPLE_CHOICE",
				prompt,
				tags,
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

const toQuestionCardInput = (question: QuestionCard): QuestionCardInput => {
	switch (question.format) {
		case "TRUE_OR_FALSE":
			return {
				difficulty: question.difficulty,
				entries: question.entries.map((entry) => ({
					answer: entry.answer,
					text: entry.text,
				})),
				format: question.format,
				prompt: question.prompt,
				tags: [...question.tags],
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				difficulty: question.difficulty,
				entries: question.entries.map((entry) => ({
					answer: [...entry.answer],
					text: entry.text,
				})),
				format: question.format,
				prompt: question.prompt,
				tags: [...question.tags],
				uiHint: question.uiHint,
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				difficulty: question.difficulty,
				entries: question.entries.map((entry) => ({
					answer: entry.answer,
					text: entry.text,
				})),
				format: question.format,
				prompt: question.prompt,
				tags: [...question.tags],
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				choices: [...question.choices],
				difficulty: question.difficulty,
				entries: question.entries.map((entry) => ({
					answer: entry.answer,
					text: entry.text,
				})),
				format: "MULTIPLE_CHOICE",
				prompt: question.prompt,
				tags: [...question.tags],
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

const toLocalQuestionCardForm = (
	card: QuestionCardInput | QuestionCard,
): LocalQuestionCardForm => {
	const source = "id" in card ? toQuestionCardInput(card) : card;

	switch (source.format) {
		case "TRUE_OR_FALSE":
			return {
				...source,
				entries: source.entries.map((entry) => ({
					...entry,
					id: createLocalId(),
				})),
			};
		case "OPEN_ENDED":
			return {
				...source,
				entries: source.entries.map((entry) => ({
					...entry,
					answer: [...entry.answer],
					id: createLocalId(),
				})),
			};
		case "ORDER_ITEMS":
			return {
				...source,
				entries: source.entries.map((entry) => ({
					...entry,
					id: createLocalId(),
				})),
			};
		case "MULTIPLE_CHOICE":
		default:
			return {
				...source,
				choices: [...source.choices],
				entries: source.entries.map((entry) => ({
					...entry,
					id: createLocalId(),
				})),
			};
	}
};

const stripLocalEntryIds = (card: LocalQuestionCardForm): QuestionCardInput => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				...card,
				entries: card.entries.map(({ id: _id, ...entry }) => entry),
			};
		case "OPEN_ENDED":
			return {
				...card,
				entries: card.entries.map(({ id: _id, ...entry }) => ({
					...entry,
					answer: [...entry.answer],
				})),
			};
		case "ORDER_ITEMS":
			return {
				...card,
				entries: card.entries.map(({ id: _id, ...entry }) => entry),
			};
		case "MULTIPLE_CHOICE":
		default:
			return {
				...card,
				choices: [...card.choices],
				entries: card.entries.map(({ id: _id, ...entry }) => entry),
			};
	}
};

const getValidationIssues = (
	card: LocalQuestionCardForm,
): ValidationIssue[] => {
	const result = questionCardInputSchema.safeParse(stripLocalEntryIds(card));
	return result.success
		? []
		: result.error.issues.map((issue) => ({
				message: issue.message,
				path: issue.path,
			}));
};

const pathStartsWith = (
	path: ReadonlyArray<PropertyKey>,
	prefix: Array<string | number>,
) => prefix.every((segment, index) => path[index] === segment);

const getFieldError = (
	issues: ValidationIssue[],
	...prefix: Array<string | number>
) => issues.find((issue) => pathStartsWith(issue.path, prefix))?.message;

const buildResetSource = (question?: QuestionCard | null) =>
	question ? toQuestionCardInput(question) : createQuestionCardInput();

const changeQuestionCardFormat = (
	card: LocalQuestionCardForm,
	format: TriviaCardFormat,
): LocalQuestionCardForm =>
	toLocalQuestionCardForm(
		createQuestionCardInput({
			difficulty: card.difficulty,
			entryCount: card.entries.length,
			format,
			prompt: card.prompt,
			tags: [...card.tags],
		}),
	);

const changeOpenEndedUiHint = (
	card: LocalOpenEndedForm,
	uiHint: OpenEndedQuestionCardInput["uiHint"],
): LocalOpenEndedForm =>
	toLocalQuestionCardForm(
		createQuestionCardInput({
			difficulty: card.difficulty,
			entryCount: card.entries.length,
			format: "OPEN_ENDED",
			prompt: card.prompt,
			tags: [...card.tags],
			uiHint,
		}),
	) as LocalOpenEndedForm;

const addEntryToQuestionCard = (
	card: LocalQuestionCardForm,
): LocalQuestionCardForm => {
	if (card.entries.length >= MAX_ENTRY_COUNT) {
		return card;
	}

	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				...card,
				entries: [
					...card.entries,
					{ answer: true, id: createLocalId(), text: "" },
				],
			};
		case "OPEN_ENDED":
			return {
				...card,
				entries: [
					...card.entries,
					{
						answer: [card.uiHint === "country" ? DEFAULT_COUNTRY_CODE : ""],
						id: createLocalId(),
						text: "",
					},
				],
			};
		case "ORDER_ITEMS":
			return {
				...card,
				entries: [
					...card.entries,
					{
						answer: card.entries.length + 1,
						id: createLocalId(),
						text: "",
					},
				],
			};
		case "MULTIPLE_CHOICE":
		default:
			return {
				...card,
				entries: [
					...card.entries,
					{ answer: "", id: createLocalId(), text: "" },
				],
			};
	}
};

const removeEntryFromQuestionCard = (
	card: LocalQuestionCardForm,
	entryId: string,
): LocalQuestionCardForm => {
	if (card.entries.length <= MIN_ENTRY_COUNT) {
		return card;
	}

	if (card.format === "ORDER_ITEMS") {
		const remainingEntries = card.entries.filter(
			(entry) => entry.id !== entryId,
		);

		return {
			...card,
			entries: remainingEntries.map((entry, index) => ({
				...entry,
				answer: index + 1,
			})),
		};
	}

	return {
		...card,
		entries: card.entries.filter((entry) => entry.id !== entryId),
	} as LocalQuestionCardForm;
};

const parseAcceptedAnswers = (value: string) => {
	const answers = value
		.split("|")
		.map((answer) => answer.trim())
		.filter(Boolean);

	return answers.length > 0 ? answers : [""];
};

export default function QuestionCardModal({
	open,
	question,
	setOpen,
}: QuestionCardModalProps) {
	const api = useApiClient();
	const resetSource = useMemo(() => buildResetSource(question), [question]);
	const resetSourceKey = question ? `edit-${question.id}` : "create";
	const [form, setForm] = useState<LocalQuestionCardForm>(() =>
		toLocalQuestionCardForm(resetSource),
	);
	const formRef = useRef(form);
	const [errors, setErrors] = useState<ValidationIssue[]>([]);
	const [submitError, setSubmitError] = useState<string>();
	const [formRenderVersion, setFormRenderVersion] = useState(0);

	const mode = question ? "edit" : "create";

	const applyNextForm = (nextForm: LocalQuestionCardForm) => {
		formRef.current = nextForm;
		setForm(nextForm);
		setErrors(getValidationIssues(nextForm));
		setSubmitError(undefined);
	};

	const resetForm = () => {
		const nextForm = toLocalQuestionCardForm(resetSource);
		formRef.current = nextForm;
		setForm(nextForm);
		setErrors([]);
		setSubmitError(undefined);
		setFormRenderVersion((current) => current + 1);
	};

	useEffect(() => {
		if (!open) {
			return;
		}

		resetForm();
	}, [open, resetSourceKey]);

	const createQuestion = api.questionsCrud.create.useMutation({
		onError: () => {
			setSubmitError(GENERIC_SUBMIT_ERROR);
		},
		onSuccess: (createdQuestion) => {
			api.questionsCrud.list.setData((current) =>
				current ? [createdQuestion, ...current] : [createdQuestion],
			);
			setOpen(false);
		},
	});

	const updateQuestion = api.questionsCrud.update.useMutation({
		onError: () => {
			setSubmitError(GENERIC_SUBMIT_ERROR);
		},
		onSuccess: (updatedQuestion) => {
			api.questionsCrud.list.setData(
				(current) =>
					current?.map((currentQuestion) =>
						currentQuestion.id === updatedQuestion.id
							? updatedQuestion
							: currentQuestion,
					) ?? [updatedQuestion],
			);
			api.questionsCrud.getById.setData(
				{ id: updatedQuestion.id },
				() => updatedQuestion,
			);
			setOpen(false);
		},
	});

	const isSaving = createQuestion.isPending || updateQuestion.isPending;

	const handleSave = () => {
		const result = questionCardInputSchema.safeParse(
			stripLocalEntryIds(formRef.current),
		);

		if (!result.success) {
			setErrors(result.error.issues);
			return;
		}

		setSubmitError(undefined);

		if (question) {
			updateQuestion.mutate({ id: question.id, ...result.data });
			return;
		}

		createQuestion.mutate(result.data);
	};

	const title =
		mode === "edit" && question
			? `Edit Trivia Card #${question.id}`
			: "Create Trivia Card";

	return (
		<Modal
			footer={
				<div className="flex w-full items-center justify-end gap-4">
					<button
						className="btn btn-error btn-md"
						disabled={isSaving}
						onClick={resetForm}
						type="button"
					>
						Reset
					</button>
					<button
						className="btn btn-primary btn-md"
						disabled={isSaving}
						onClick={handleSave}
						type="button"
					>
						{isSaving
							? mode === "create"
								? "Creating..."
								: "Saving..."
							: mode === "create"
								? "Create card"
								: "Save changes"}
					</button>
				</div>
			}
			mobileSheet={false}
			open={open}
			setOpen={setOpen}
			size="lg"
			title={title}
		>
			<div
				key={`${resetSourceKey}-${formRenderVersion}`}
				className="grid gap-6 px-3 pb-2"
			>
				<div className="grid gap-5">
					<fieldset className="fieldset">
						<legend className="fieldset-legend text-xl font-semibold">
							Card settings
						</legend>
						<label className="label px-0 pb-1 font-semibold text-base-content">
							Prompt
						</label>
						<textarea
							className={cn(
								"textarea w-full",
								getFieldError(errors, "prompt") && "textarea-error",
							)}
							defaultValue={form.prompt}
							onBlur={(event) => {
								applyNextForm({
									...formRef.current,
									prompt: event.target.value,
								});
							}}
							placeholder="What should players solve?"
							rows={4}
						/>
					</fieldset>

					<div className="grid gap-4 xl:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,1fr)]">
						<fieldset className="fieldset min-w-0">
							<legend className="fieldset-legend text-sm font-semibold">
								Question format
							</legend>
							<select
								className={cn(
									"select select-sm w-full",
									getFieldError(errors, "format") && "border-error",
								)}
								onChange={(event) =>
									applyNextForm(
										changeQuestionCardFormat(
											formRef.current,
											event.target.value as TriviaCardFormat,
										),
									)
								}
								value={form.format}
							>
								{triviaCardFormatSchema.options.map((format) => (
									<option key={format} value={format}>
										{questionTypeLabels[format]}
									</option>
								))}
							</select>
						</fieldset>

						<fieldset className="fieldset">
							<legend className="fieldset-legend text-sm font-semibold">
								Difficulty
							</legend>
							<select
								className={cn(
									"select select-sm w-full",
									getFieldError(errors, "difficulty") && "border-error",
								)}
								onChange={(event) =>
									applyNextForm({
										...formRef.current,
										difficulty: event.target
											.value as QuestionCardInput["difficulty"],
									})
								}
								value={form.difficulty}
							>
								{triviaCardDifficultySchema.options.map((difficulty) => (
									<option key={difficulty} value={difficulty}>
										{difficultyLabels[difficulty]}
									</option>
								))}
							</select>
						</fieldset>

						<fieldset className="fieldset">
							<legend className="fieldset-legend text-sm font-semibold">
								Answer hint
							</legend>
							<select
								className={cn(
									"select select-sm w-full",
									getFieldError(errors, "uiHint") && "border-error",
								)}
								disabled={form.format !== "OPEN_ENDED"}
								onChange={(event) => {
									if (formRef.current.format !== "OPEN_ENDED") {
										return;
									}

									applyNextForm(
										changeOpenEndedUiHint(
											formRef.current,
											event.target.value === "country" ? "country" : undefined,
										),
									);
								}}
								value={
									form.format === "OPEN_ENDED"
										? (form.uiHint ?? "none")
										: "none"
								}
							>
								<option value="none">No hint</option>
								<option value="country">Country</option>
							</select>
						</fieldset>

						<fieldset className="fieldset">
							<legend className="fieldset-legend text-sm font-semibold">
								Tags
							</legend>
							<TagInput
								invalid={Boolean(getFieldError(errors, "tags"))}
								maxItems={5}
								onChange={(nextTags) =>
									applyNextForm({
										...formRef.current,
										tags: nextTags,
									})
								}
								placeholder="Type tag and press Enter"
								values={form.tags}
							/>
						</fieldset>
					</div>

					{form.format === "MULTIPLE_CHOICE" ? (
						<fieldset className="fieldset min-w-0">
							<legend className="fieldset-legend text-sm font-semibold">
								Choices
							</legend>
							<TagInput
								invalid={Boolean(getFieldError(errors, "choices"))}
								maxItems={MAX_MULTIPLE_CHOICE_CHOICES}
								onChange={(nextChoices) => {
									const currentForm = formRef.current;
									if (currentForm.format !== "MULTIPLE_CHOICE") {
										return;
									}

									applyNextForm({
										...currentForm,
										choices: nextChoices,
										entries: currentForm.entries.map((entry) => ({
											...entry,
											answer: nextChoices.includes(entry.answer)
												? entry.answer
												: "",
										})),
									});
								}}
								placeholder="Type choice and press Enter"
								values={form.choices}
							/>
						</fieldset>
					) : null}
				</div>

				<div className="grid gap-4 pb-24">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-xl font-bold">Entries</h2>
						</div>
					</div>

					<div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
						<table className="table table-sm">
							<colgroup>
								<col className="w-1/2" />
								<col className="w-1/2" />
								<col className="w-px" />
							</colgroup>
							<thead>
								<tr>
									<th>Text</th>
									<th>Answer</th>
									<th>
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{form.entries.map((entry, entryIndex) => (
									<tr key={entry.id}>
										<td>
											<input
												className={cn(
													"input input-sm w-full",
													getFieldError(
														errors,
														"entries",
														entryIndex,
														"text",
													) && "input-error",
												)}
												defaultValue={entry.text}
												onBlur={(event) => {
													applyNextForm({
														...formRef.current,
														entries: formRef.current.entries.map(
															(currentEntry) =>
																currentEntry.id === entry.id
																	? {
																			...currentEntry,
																			text: event.target.value,
																		}
																	: currentEntry,
														),
													} as LocalQuestionCardForm);
												}}
												type="text"
											/>
										</td>
										<td>
											{form.format === "MULTIPLE_CHOICE"
												? (() => {
														const multipleChoiceEntry =
															entry as LocalMultipleChoiceForm["entries"][number];
														return (
															<select
																className={cn(
																	"select select-sm w-full",
																	getFieldError(
																		errors,
																		"entries",
																		entryIndex,
																		"answer",
																	) && "border-error",
																)}
																onChange={(event) => {
																	const currentForm = formRef.current;
																	if (
																		currentForm.format !== "MULTIPLE_CHOICE"
																	) {
																		return;
																	}

																	applyNextForm({
																		...currentForm,
																		entries: currentForm.entries.map(
																			(currentEntry) =>
																				currentEntry.id === entry.id
																					? {
																							...currentEntry,
																							answer: event.target.value,
																						}
																					: currentEntry,
																		),
																	});
																}}
																value={multipleChoiceEntry.answer}
															>
																<option value="">Pick answer</option>
																{form.choices.map((choice) => (
																	<option key={choice} value={choice}>
																		{choice}
																	</option>
																))}
															</select>
														);
													})()
												: form.format === "TRUE_OR_FALSE"
													? (() => {
															const trueOrFalseEntry =
																entry as LocalTrueOrFalseForm["entries"][number];
															return (
																<select
																	className={cn(
																		"select select-sm w-full",
																		getFieldError(
																			errors,
																			"entries",
																			entryIndex,
																			"answer",
																		) && "border-error",
																	)}
																	onChange={(event) => {
																		const currentForm = formRef.current;
																		if (
																			currentForm.format !== "TRUE_OR_FALSE"
																		) {
																			return;
																		}

																		applyNextForm({
																			...currentForm,
																			entries: currentForm.entries.map(
																				(currentEntry) =>
																					currentEntry.id === entry.id
																						? {
																								...currentEntry,
																								answer:
																									event.target.value === "true",
																							}
																						: currentEntry,
																			),
																		});
																	}}
																	value={String(trueOrFalseEntry.answer)}
																>
																	<option value="true">True</option>
																	<option value="false">False</option>
																</select>
															);
														})()
													: form.format === "ORDER_ITEMS"
														? (() => {
																const orderItemsEntry =
																	entry as LocalOrderItemsForm["entries"][number];
																return (
																	<select
																		className={cn(
																			"select select-sm w-full",
																			getFieldError(
																				errors,
																				"entries",
																				entryIndex,
																				"answer",
																			) && "border-error",
																		)}
																		onChange={(event) => {
																			const currentForm = formRef.current;
																			if (
																				currentForm.format !== "ORDER_ITEMS"
																			) {
																				return;
																			}

																			applyNextForm({
																				...currentForm,
																				entries: currentForm.entries.map(
																					(currentEntry) =>
																						currentEntry.id === entry.id
																							? {
																									...currentEntry,
																									answer: Number(
																										event.target.value,
																									),
																								}
																							: currentEntry,
																				),
																			});
																		}}
																		value={String(orderItemsEntry.answer)}
																	>
																		{form.entries.map((_, positionIndex) => (
																			<option
																				key={`order-${positionIndex + 1}`}
																				value={String(positionIndex + 1)}
																			>
																				{`#${positionIndex + 1}`}
																			</option>
																		))}
																	</select>
																);
															})()
														: form.uiHint === "country"
															? (() => {
																	const openEndedEntry =
																		entry as LocalOpenEndedForm["entries"][number];
																	return (
																		<CountryPicker
																			className={cn(
																				getFieldError(
																					errors,
																					"entries",
																					entryIndex,
																					"answer",
																				) && "border-error",
																			)}
																			onChange={(value) => {
																				const currentForm = formRef.current;
																				if (
																					currentForm.format !== "OPEN_ENDED"
																				) {
																					return;
																				}

																				applyNextForm({
																					...currentForm,
																					entries: currentForm.entries.map(
																						(currentEntry) =>
																							currentEntry.id === entry.id
																								? {
																										...currentEntry,
																										answer: [
																											value.toUpperCase(),
																										],
																									}
																								: currentEntry,
																					),
																				});
																			}}
																			value={openEndedEntry.answer[0]}
																		/>
																	);
																})()
															: (() => {
																	const openEndedEntry =
																		entry as LocalOpenEndedForm["entries"][number];
																	return (
																		<input
																			className={cn(
																				"input input-sm w-full",
																				getFieldError(
																					errors,
																					"entries",
																					entryIndex,
																					"answer",
																				) && "input-error",
																			)}
																			defaultValue={openEndedEntry.answer.join(
																				" | ",
																			)}
																			onBlur={(event) => {
																				const currentForm = formRef.current;
																				if (
																					currentForm.format !== "OPEN_ENDED"
																				) {
																					return;
																				}

																				applyNextForm({
																					...currentForm,
																					entries: currentForm.entries.map(
																						(currentEntry) =>
																							currentEntry.id === entry.id
																								? {
																										...currentEntry,
																										answer:
																											parseAcceptedAnswers(
																												event.target.value,
																											),
																									}
																								: currentEntry,
																					),
																				});
																			}}
																			placeholder="Accepted answer | alternative answer"
																			type="text"
																		/>
																	);
																})()}
										</td>
										<td>
											<button
												onClick={() => {
													applyNextForm(
														removeEntryFromQuestionCard(
															formRef.current,
															entry.id,
														),
													);
												}}
												type="button"
											>
												<TrashIcon
													aria-label="Delete entry"
													className={cn(
														"size-4 text-base-content/60 transition-colors",
														form.entries.length <= MIN_ENTRY_COUNT
															? "cursor-not-allowed opacity-50 hover:text-base-content/60"
															: "hover:text-error",
													)}
												/>
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{submitError ? (
						<p className="font-semibold text-error">{submitError}</p>
					) : null}

					<div>
						<button
							className="btn btn-sm"
							disabled={form.entries.length >= MAX_ENTRY_COUNT || isSaving}
							onClick={() => {
								applyNextForm(addEntryToQuestionCard(formRef.current));
							}}
							type="button"
						>
							<Plus size={16} />
							Add row
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
}
