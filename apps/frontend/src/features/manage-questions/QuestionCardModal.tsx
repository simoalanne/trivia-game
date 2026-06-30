"use client";

import {
	MAX_ENTRIES_PER_CARD,
	MIN_ENTRIES_PER_CARD,
	type QuestionCard,
} from "@packages/contracts";
import { Plus, TrashIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { CountryPicker, Modal, TagInput } from "@/components";
import { cn } from "@/lib/utils";
import {
	createOrderItemsTemplateFormState,
	createTrueOrFalseTemplateFormState,
} from "./questionCardFormUtils";
import { useQuestionCardForm } from "./useQuestionCardForm";

type QuestionCardModalProps = {
	open: boolean;
	question?: QuestionCard | null;
	setOpen: (open: boolean) => void;
};

const answerModeLabels = {
	TEXT: "Open ended",
	CHOICES: "Multiple choice",
	COUNTRY: "Country",
} as const;

const difficultyLabels = {
	EASY: "Easy",
	MEDIUM: "Medium",
	HARD: "Hard",
} as const;

const removeDuplicateChoiceAnswers = (
	entries: Array<{ id: string; text: string; answer: string }>,
) => {
	const usedAnswers = new Set<string>();

	return entries.map((entry) => {
		if (!entry.answer || usedAnswers.has(entry.answer)) {
			return {
				...entry,
				answer: "",
			};
		}

		usedAnswers.add(entry.answer);
		return entry;
	});
};

const getAvailableChoicesForEntry = (
	entries: Array<{ id: string; answer: string }>,
	entryId: string,
	choices: string[],
	choicesAreUnique: boolean,
) => {
	if (!choicesAreUnique) {
		return choices;
	}

	const usedByOtherEntries = new Set(
		entries
			.filter((entry) => entry.id !== entryId)
			.map((entry) => entry.answer)
			.filter(Boolean),
	);

	return choices.filter((choice) => !usedByOtherEntries.has(choice));
};

export default function QuestionCardModal({
	open,
	question,
	setOpen,
}: QuestionCardModalProps) {
	const mode = question ? "edit" : "create";
	const title =
		mode === "edit" && question
			? `Edit Trivia Card #${question.id}`
			: "Create Trivia Card";
	const {
		formState,
		setFormState,
		errors,
		setErrors,
		setAnswerMode,
		isScanningImage,
		isSubmitting,
		scanImageToDraft,
		submitError,
		submitSucceeded,
		onSubmit,
		onReset,
	} = useQuestionCardForm(question);
	const imageInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (submitSucceeded) {
			setOpen(false);
		}
	}, [setOpen, submitSucceeded]);

	useEffect(() => {
		if (!open) {
			onReset();
		}
	}, [onReset, open]);

	return (
		<Modal
			footer={
				<div className="flex w-full items-center justify-end gap-4">
					<button
						className="btn btn-md"
						disabled={isSubmitting}
						onClick={onReset}
						type="button"
					>
						Reset
					</button>
					<button
						className="btn btn-primary btn-md"
						disabled={isSubmitting}
						onClick={() => {
							onSubmit();
						}}
						type="button"
					>
						{isSubmitting
							? mode === "edit"
								? "Saving..."
								: "Creating..."
							: mode === "edit"
								? "Save changes"
								: "Create trivia card"}
					</button>
				</div>
			}
			mobileSheet={false}
			open={open}
			setOpen={setOpen}
			size="lg"
			title={title}
		>
			<div className="grid gap-6 px-3 pb-2">
				<div className="grid gap-5">
					{mode === "create" ? (
						<div className="flex flex-wrap items-start gap-x-6 gap-y-4">
							<div className="grid min-w-0 w-full max-w-sm gap-4">
								<fieldset className="fieldset min-w-0">
									<legend className="fieldset-legend text-sm font-semibold">
										Templates
									</legend>
									<div className="flex flex-wrap gap-2">
										<button
											className="btn btn-sm"
											onClick={() => {
												setFormState(createTrueOrFalseTemplateFormState());
												setErrors({});
											}}
											type="button"
										>
											True or False
										</button>
										<button
											className="btn btn-sm"
											onClick={() => {
												setFormState(createOrderItemsTemplateFormState());
												setErrors({});
											}}
											type="button"
										>
											Order items
										</button>
									</div>
								</fieldset>
							</div>

							<div className="grid min-w-0  max-w-sm gap-4 self-start">
								<fieldset className="fieldset min-w-0">
									<legend className="fieldset-legend text-sm font-semibold">
										AI-features
									</legend>
									<input
										accept="image/*"
										className="hidden"
										onChange={async (event) => {
											const file = event.target.files?.[0];
											event.target.value = "";

											if (!file) {
												return;
											}

											await scanImageToDraft(file);
										}}
										ref={imageInputRef}
										type="file"
									/>
									<button
										className="btn btn-sm"
										disabled={isScanningImage}
										onClick={() => {
											imageInputRef.current?.click();
										}}
										type="button"
									>
										{isScanningImage ? (
											<>
												<span className="loading loading-spinner loading-sm" />
												Scanning...
											</>
										) : (
											"Scan physical card"
										)}
									</button>
								</fieldset>
							</div>
						</div>
					) : null}

					<fieldset className="fieldset">
						<legend className="fieldset-legend text-xl font-semibold">
							Card settings
						</legend>
						<label
							className="label px-0 pb-1 font-semibold text-base-content"
							htmlFor="prompt"
						>
							Prompt
						</label>
						<textarea
							className={cn(
								"textarea w-full",
								errors.prompt && "textarea-error",
							)}
							onChange={(event) => {
								setFormState((current) => ({
									...current,
									prompt: event.target.value,
								}));
							}}
							rows={4}
							value={formState.prompt}
						/>
						{errors.prompt ? (
							<p className="pt-1 text-sm text-error">{errors.prompt}</p>
						) : null}
					</fieldset>

					<div className="flex flex-wrap items-start gap-x-6 gap-y-4">
						<div className="grid min-w-0 w-full max-w-sm gap-4">
							<fieldset className="fieldset min-w-0">
								<legend className="fieldset-legend text-sm font-semibold">
									Answer mode
								</legend>
								<select
									className={cn(
										"select select-sm w-full",
										errors.answerMode && "select-error",
									)}
									onChange={(event) => {
										setAnswerMode(
											event.target.value as keyof typeof answerModeLabels,
										);
									}}
									value={formState.answerMode}
								>
									<option value="CHOICES">{answerModeLabels.CHOICES}</option>
									<option value="TEXT">{answerModeLabels.TEXT}</option>
									<option value="COUNTRY">{answerModeLabels.COUNTRY}</option>
								</select>
							</fieldset>

							<fieldset className="fieldset min-w-0">
								<legend className="fieldset-legend text-sm font-semibold">
									Difficulty
								</legend>
								<select
									className={cn(
										"select select-sm w-full",
										errors.difficulty && "select-error",
									)}
									onChange={(event) => {
										setFormState((current) => ({
											...current,
											difficulty: event.target
												.value as keyof typeof difficultyLabels,
										}));
									}}
									value={formState.difficulty}
								>
									<option value="EASY">{difficultyLabels.EASY}</option>
									<option value="MEDIUM">{difficultyLabels.MEDIUM}</option>
									<option value="HARD">{difficultyLabels.HARD}</option>
								</select>
							</fieldset>

							<fieldset className="fieldset min-w-0">
								<legend className="fieldset-legend text-sm font-semibold">
									Tags
								</legend>
								<TagInput
									invalid={Boolean(errors.tags)}
									onChange={(tags) => {
										setFormState((current) => ({
											...current,
											tags,
										}));
									}}
									placeholder="Type tag and press Enter"
									values={formState.tags}
								/>
							</fieldset>
						</div>

						{formState.answerMode === "CHOICES" ? (
							<div className="grid min-w-0 flex-1 basis-80 gap-4 self-start">
								<fieldset className="fieldset min-w-0">
									<legend className="fieldset-legend text-sm font-semibold">
										Choice rules
									</legend>
									<label className="label cursor-pointer justify-start gap-3 px-0">
										<input
											checked={formState.choicesAreUnique}
											className="checkbox checkbox-sm"
											onChange={(event) => {
												setFormState((current) =>
													current.answerMode !== "CHOICES"
														? current
														: {
																...current,
																choicesAreUnique: event.target.checked,
																entries: event.target.checked
																	? removeDuplicateChoiceAnswers(
																			current.entries,
																		)
																	: current.entries,
															},
												);
											}}
											type="checkbox"
										/>
										<span className="label-text">
											Each choice can be used only once
										</span>
									</label>
								</fieldset>

								<fieldset className="fieldset min-w-0">
									<legend className="fieldset-legend text-sm font-semibold">
										Choices
									</legend>
									<TagInput
										invalid={Boolean(errors.choices)}
										maxItems={MAX_ENTRIES_PER_CARD}
										onChange={(choices) => {
											setFormState((current) =>
												current.answerMode !== "CHOICES"
													? current
													: {
															...current,
															choices,
														},
											);
										}}
										placeholder="Type choice and press Enter"
										values={formState.choices}
									/>
								</fieldset>
							</div>
						) : null}
					</div>
				</div>

				<div className="grid gap-4 pb-2">
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
								{formState.entries.map((entry, index) => (
									<tr key={entry.id}>
										<td>
											<input
												className={cn(
													"input input-sm w-full",
													errors[`entries.${index}.text`] && "input-error",
												)}
												onChange={(event) => {
													setFormState((current) => ({
														...current,
														entries: current.entries.map((currentEntry) =>
															currentEntry.id === entry.id
																? {
																		...currentEntry,
																		text: event.target.value,
																	}
																: currentEntry,
														),
													}));
												}}
												type="text"
												value={entry.text}
											/>
											{errors[`entries.${index}.text`] ? (
												<p className="pt-1 text-xs text-error">
													{errors[`entries.${index}.text`]}
												</p>
											) : null}
										</td>
										<td>
											{formState.answerMode === "CHOICES" ? (
												<>
													{(() => {
														const availableChoices =
															getAvailableChoicesForEntry(
																formState.entries,
																entry.id,
																formState.choices,
																formState.choicesAreUnique,
															);

														return (
															<select
																className={cn(
																	"select select-sm w-full",
																	errors[`entries.${index}.answer`] &&
																		"select-error",
																)}
																onChange={(event) => {
																	setFormState((current) => ({
																		...current,
																		entries: current.entries.map(
																			(currentEntry) =>
																				currentEntry.id === entry.id
																					? {
																							...currentEntry,
																							answer: event.target.value,
																						}
																					: currentEntry,
																		),
																	}));
																}}
																value={entry.answer}
															>
																<option value="">Pick answer</option>
																{availableChoices.map((choice) => (
																	<option key={choice} value={choice}>
																		{choice}
																	</option>
																))}
															</select>
														);
													})()}
													{errors[`entries.${index}.answer`] ? (
														<p className="pt-1 text-xs text-error">
															{errors[`entries.${index}.answer`]}
														</p>
													) : null}
												</>
											) : formState.answerMode === "COUNTRY" ? (
												<>
													<CountryPicker
														className={cn(
															"btn-sm",
															errors[`entries.${index}.answer`] &&
																"border-error",
														)}
														onChange={(value) => {
															setFormState((current) => ({
																...current,
																entries: current.entries.map((currentEntry) =>
																	currentEntry.id === entry.id
																		? {
																				...currentEntry,
																				answer: value,
																			}
																		: currentEntry,
																),
															}));
														}}
														value={entry.answer}
													/>
													{errors[`entries.${index}.answer`] ? (
														<p className="pt-1 text-xs text-error">
															{errors[`entries.${index}.answer`]}
														</p>
													) : null}
												</>
											) : (
												<>
													<input
														className={cn(
															"input input-sm w-full",
															errors[`entries.${index}.answer`] &&
																"input-error",
														)}
														onChange={(event) => {
															setFormState((current) => ({
																...current,
																entries: current.entries.map((currentEntry) =>
																	currentEntry.id === entry.id
																		? {
																				...currentEntry,
																				answer: event.target.value,
																			}
																		: currentEntry,
																),
															}));
														}}
														placeholder="Type answer"
														type="text"
														value={entry.answer}
													/>
													{errors[`entries.${index}.answer`] ? (
														<p className="pt-1 text-xs text-error">
															{errors[`entries.${index}.answer`]}
														</p>
													) : null}
												</>
											)}
										</td>
										<td>
											<button
												onClick={() => {
													if (
														formState.entries.length <= MIN_ENTRIES_PER_CARD
													) {
														return;
													}

													setFormState((current) => ({
														...current,
														entries: current.entries.filter(
															(currentEntry) => currentEntry.id !== entry.id,
														),
													}));
												}}
												type="button"
											>
												<TrashIcon
													aria-label="Delete entry"
													className={cn(
														"size-4 text-base-content/60 transition-colors",
														formState.entries.length <= MIN_ENTRIES_PER_CARD &&
															"cursor-not-allowed opacity-50 hover:text-base-content/60",
														formState.entries.length > MIN_ENTRIES_PER_CARD &&
															"hover:text-error",
													)}
												/>
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div>
						<button
							className="btn btn-sm"
							onClick={() => {
								if (formState.entries.length >= MAX_ENTRIES_PER_CARD) {
									return;
								}

								setFormState((current) => ({
									...current,
									entries: [
										...current.entries,
										{ id: crypto.randomUUID(), text: "", answer: "" },
									],
								}));
							}}
							type="button"
						>
							<Plus size={16} />
							Add row
						</button>
					</div>
					{Object.keys(errors).length > 0 ? (
						<div className="alert alert-error">
							<span>Please fix the highlighted fields before saving.</span>
						</div>
					) : null}
					{submitError ? (
						<div className="alert alert-error">
							<span>{submitError}</span>
						</div>
					) : null}
				</div>
			</div>
		</Modal>
	);
}
