"use client";

import {
	type QuestionCardInput,
	type TriviaCardFormat,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
} from "@packages/contracts";
import { Button, Field, Select, TextInput } from "@/components";
import styles from "./QuestionCardSettings.module.css";

type MultipleChoiceQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "MULTIPLE_CHOICE" }
>;

type QuestionCardSettingsProps = {
	card: MultipleChoiceQuestionCardInput;
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
};

const questionTypeLabels: Record<TriviaCardFormat, string> = {
	MULTIPLE_CHOICE: "Multiple choice",
	TRUE_OR_FALSE: "True or false",
	OPEN_ENDED: "Open ended",
	ORDER_ITEMS: "Order items",
};

export default function QuestionCardSettings({
	card,
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
}: QuestionCardSettingsProps) {
	return (
		<div className={styles.panel}>
			<div className={styles.scrollBody}>
				<Field error={getFieldError("prompt")} htmlFor="prompt" label="Prompt">
					<textarea
						className={`${styles.textarea} ${
							getFieldError("prompt") ? styles.textareaInvalid : ""
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
						<Select
							id="difficulty"
							invalid={Boolean(getFieldError("difficulty"))}
							onChange={(event) =>
								onDifficultyChange(
									event.target.value as QuestionCardInput["difficulty"],
								)
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
								onFormatChange(event.target.value as TriviaCardFormat)
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
							disabled={isSubmitting}
							onClick={onAddTag}
							size="sm"
							variant="secondary"
						>
							Add tag
						</Button>
					</div>
				</Field>

				<section className={styles.section} aria-label="Choices">
					<div className={styles.sectionHeader}>
						<div>
							<h2>Choices</h2>
							<p>
								Multiple choice cards share one choice list across all entries.
							</p>
						</div>
						<button
							className={styles.inlineAction}
							disabled={isSubmitting}
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
			</div>
		</div>
	);
}
