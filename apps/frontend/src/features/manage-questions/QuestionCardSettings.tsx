"use client";

import {
	type QuestionCardInput,
	type TriviaCardFormat,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
} from "@packages/contracts";
import { Button, Field, TextInput } from "@/components";
import { ChipPicker } from "@/components/ChipPicker";
import styles from "./QuestionCardSettings.module.css";

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
		<div className={styles.panel}>
			<div className={styles.scrollBody}>
				<Field error={getFieldError("prompt")} htmlFor="prompt" label="Prompt">
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
				</Field>

				<div className={styles.inlineFields}>
					<Field
						error={getFieldError("difficulty")}
						htmlFor="difficulty"
						label="Difficulty"
					>
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
					</Field>

					<Field
						error={getFieldError("format")}
						htmlFor="format"
						label="Question type"
					>
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
					</Field>
				</div>

				<Field
					description="Tags are optional, must be unique, and can have up to 3 items."
					error={getFieldError("tags")}
					label="Tags"
				>
					<div className={styles.listEditor}>
						{card.tags.map((tag, tagIndex) => (
							<div className={styles.rowEditor} key={`tag-${tagIndex}`}>
								<TextInput
									invalid={Boolean(getFieldError("tags", tagIndex))}
									onChange={(event) =>
										onTagChange(tagIndex, event.target.value)
									}
									placeholder="Category tag"
									value={tag}
								/>
								<Button
									disabled={isSubmitting}
									onClick={() => onRemoveTag(tagIndex)}
									size="sm"
									variant="ghost"
								>
									Remove
								</Button>
							</div>
						))}
						<Button
							disabled={isSubmitting || !canAddTag}
							onClick={onAddTag}
							size="sm"
							variant="secondary"
						>
							Add tag
						</Button>
					</div>
				</Field>

				{card.format === "OPEN_ENDED" ? (
					<section className={styles.section} aria-label="Answer input">
						<div className={styles.sectionHeader}>
							<div>
								<h2>Answer input</h2>
								<p>Choose how players enter answers during gameplay.</p>
							</div>
						</div>

						<Field error={getFieldError("uiHint")} label="Input style">
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
						</Field>
					</section>
				) : null}

				{card.format === "MULTIPLE_CHOICE" ? (
					<section className={styles.section} aria-label="Choices">
						<div className={styles.sectionHeader}>
							<div>
								<h2>Choices</h2>
								<p>
									Multiple choice cards share one choice list across all
									entries. Add between 2 and 5 unique choices.
								</p>
							</div>
							<button
								className={styles.inlineAction}
								disabled={isSubmitting || !canAddChoice}
								onClick={onAddChoice}
								type="button"
							>
								Add choice
							</button>
						</div>

						<div className={styles.listEditor}>
							{card.choices.map((choice, choiceIndex) => (
								<div className={styles.rowEditor} key={`choice-${choiceIndex}`}>
									<TextInput
										invalid={Boolean(getFieldError("choices", choiceIndex))}
										onChange={(event) =>
											onChoiceChange(choiceIndex, event.target.value)
										}
										placeholder={`Choice ${choiceIndex + 1}`}
										value={choice}
									/>
									<button
										className={styles.inlineRemove}
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
