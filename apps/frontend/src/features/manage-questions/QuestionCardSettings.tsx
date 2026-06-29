"use client";

import {
	type QuestionCardInput,
	type TriviaCardFormat,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
} from "@packages/contracts";
import { ChipPicker } from "@/components/ChipPicker";

type TriviaCardUiHint = Extract<
	QuestionCardInput,
	{ format: "OPEN_ENDED" }
>["uiHint"];

type QuestionCardSettingsProps = {
	card: QuestionCardInput;
	canAddChoice: boolean;
	canAddTag: boolean;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	isSubmitting: boolean;
	onAddChoice: () => void;
	onAddTag: () => void;
	onChoiceChange: (choiceIndex: number, value: string) => void;
	onDifficultyChange: (difficulty: QuestionCardInput["difficulty"]) => void;
	onFormatChange: (format: TriviaCardFormat) => void;
	onPromptChange: (prompt: string) => void;
	onRemoveChoice: (choiceIndex: number) => void;
	onRemoveTag: (tagIndex: number) => void;
	onTagChange: (tagIndex: number, value: string) => void;
	onUiHintChange: (uiHint: TriviaCardUiHint | undefined) => void;
};

const questionTypeLabels: Record<TriviaCardFormat, string> = {
	MULTIPLE_CHOICE: "Multiple choice",
	TRUE_OR_FALSE: "True or false",
	OPEN_ENDED: "Open ended",
	ORDER_ITEMS: "Order items",
};

const openEndedUiHintOptions = [
	{ label: "Plain text", value: "none" },
	{ label: "Country picker", value: "country" },
];

export default function QuestionCardSettings({
	card,
	canAddChoice,
	canAddTag,
	getFieldError,
	isSubmitting,
	onAddChoice,
	onAddTag,
	onChoiceChange,
	onDifficultyChange,
	onFormatChange,
	onPromptChange,
	onRemoveChoice,
	onRemoveTag,
	onTagChange,
	onUiHintChange,
}: QuestionCardSettingsProps) {
	return (
		<div className="grid h-full min-h-0">
			<div className="grid min-h-0 content-start gap-4 overflow-auto pr-1">
				<fieldset className="fieldset w-full gap-2">
					<label
						className="fieldset-legend text-sm font-semibold"
						htmlFor="prompt"
					>
						Prompt
					</label>
					<textarea
						className={`textarea min-h-32 w-full ${
							getFieldError("prompt") ? "textarea-error" : ""
						}`}
						id="prompt"
						onChange={(event) => onPromptChange(event.target.value)}
						placeholder="What should players solve?"
						rows={5}
						value={card.prompt}
					/>
					{getFieldError("prompt") ? (
						<p className="label px-0 text-sm font-semibold text-error">
							{getFieldError("prompt")}
						</p>
					) : null}
				</fieldset>

				<div className="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
					<fieldset className="fieldset w-full gap-2">
						<legend className="fieldset-legend text-sm font-semibold">
							Difficulty
						</legend>
						<ChipPicker
							onChange={(value) =>
								onDifficultyChange(value as QuestionCardInput["difficulty"])
							}
							options={triviaCardDifficultySchema.options.map((difficulty) => ({
								label: difficulty,
								value: difficulty,
							}))}
							value={card.difficulty}
						/>
						{getFieldError("difficulty") ? (
							<p className="label px-0 text-sm font-semibold text-error">
								{getFieldError("difficulty")}
							</p>
						) : null}
					</fieldset>

					<fieldset className="fieldset w-full gap-2">
						<legend className="fieldset-legend text-sm font-semibold">
							Question type
						</legend>
						<ChipPicker
							onChange={(value) =>
								onFormatChange(value as QuestionCardInput["format"])
							}
							options={triviaCardFormatSchema.options.map((format) => ({
								label: questionTypeLabels[format],
								value: format,
							}))}
							value={card.format}
						/>
						{getFieldError("format") ? (
							<p className="label px-0 text-sm font-semibold text-error">
								{getFieldError("format")}
							</p>
						) : null}
					</fieldset>
				</div>

				<fieldset className="fieldset w-full gap-2">
					<legend className="fieldset-legend text-sm font-semibold">
						Tags
					</legend>
					<div className="grid gap-3">
						{card.tags.map((tag, tagIndex) => (
							<div
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[760px]:grid-cols-1"
								key={`tag-${tagIndex}`}
							>
								<input
									aria-invalid={
										Boolean(getFieldError("tags", tagIndex)) || undefined
									}
									className={`input w-full ${
										getFieldError("tags", tagIndex) ? "input-error" : ""
									}`}
									onChange={(event) =>
										onTagChange(tagIndex, event.target.value)
									}
									placeholder="Category tag"
									value={tag}
								/>
								<button
									className="btn btn-ghost btn-sm"
									disabled={isSubmitting}
									onClick={() => onRemoveTag(tagIndex)}
									type="button"
								>
									Remove
								</button>
							</div>
						))}
						<button
							className="btn btn-sm"
							disabled={isSubmitting || !canAddTag}
							onClick={onAddTag}
							type="button"
						>
							Add tag
						</button>
					</div>
					<p className="label px-0 text-sm text-base-content/70">
						Tags are optional, must be unique, and can have up to 3 items.
					</p>
					{getFieldError("tags") ? (
						<p className="label px-0 text-sm font-semibold text-error">
							{getFieldError("tags")}
						</p>
					) : null}
				</fieldset>

				{card.format === "OPEN_ENDED" ? (
					<section className="grid gap-3" aria-label="Answer input">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2>Answer input</h2>
								<p className="text-base-content/70">
									Choose how players enter answers during gameplay.
								</p>
							</div>
						</div>

						<fieldset className="fieldset w-full gap-2">
							<legend className="fieldset-legend text-sm font-semibold">
								Input style
							</legend>
							<ChipPicker
								onChange={(value) =>
									onUiHintChange(
										value === "country"
											? ("country" satisfies TriviaCardUiHint)
											: undefined,
									)
								}
								options={openEndedUiHintOptions}
								value={card.uiHint ?? "none"}
							/>
							{getFieldError("uiHint") ? (
								<p className="label px-0 text-sm font-semibold text-error">
									{getFieldError("uiHint")}
								</p>
							) : null}
						</fieldset>
					</section>
				) : null}

				{card.format === "MULTIPLE_CHOICE" ? (
					<section className="grid gap-3" aria-label="Choices">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<h2>Choices</h2>
								<p className="text-base-content/70">
									Multiple choice cards share one choice list across all
									entries. Add between 2 and 5 unique choices.
								</p>
							</div>
							<button
								className="btn btn-sm"
								disabled={isSubmitting || !canAddChoice}
								onClick={onAddChoice}
								type="button"
							>
								Add choice
							</button>
						</div>

						<div className="grid gap-3">
							{card.choices.map((choice, choiceIndex) => (
								<div
									className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[760px]:grid-cols-1"
									key={`choice-${choiceIndex}`}
								>
									<input
										aria-invalid={
											Boolean(getFieldError("choices", choiceIndex)) ||
											undefined
										}
										className={`input w-full ${
											getFieldError("choices", choiceIndex) ? "input-error" : ""
										}`}
										onChange={(event) =>
											onChoiceChange(choiceIndex, event.target.value)
										}
										placeholder={`Choice ${choiceIndex + 1}`}
										value={choice}
									/>
									<button
										className="btn btn-ghost btn-sm"
										disabled={isSubmitting || card.choices.length <= 2}
										onClick={() => onRemoveChoice(choiceIndex)}
										type="button"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					</section>
				) : null}
			</div>
		</div>
	);
}
