"use client";

import type { ReactNode } from "react";
import { Field, TextInput } from "@/components";
import styles from "./QuestionEntryEditor.module.css";

type QuestionEntryEditorLayoutProps = {
	children: ReactNode;
	entryIndex: number;
	explanation?: string;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	onEntryExplanationChange: (entryIndex: number, value: string) => void;
	onEntryTextChange: (entryIndex: number, value: string) => void;
	prompt: string;
	text: string;
};

export default function QuestionEntryEditorLayout({
	children,
	entryIndex,
	explanation,
	getFieldError,
	onEntryExplanationChange,
	onEntryTextChange,
	prompt,
	text,
}: QuestionEntryEditorLayoutProps) {
	return (
		<div className={styles.scrollBody}>
			<p className={styles.metaText}>
				{prompt.trim() || "Set a card prompt from the center of the wheel."}
			</p>

			<Field
				error={getFieldError("entries", entryIndex, "text")}
				htmlFor="entry-text"
				label={`Entry ${entryIndex + 1} text`}
			>
				<TextInput
					id="entry-text"
					invalid={Boolean(getFieldError("entries", entryIndex, "text"))}
					onChange={(event) =>
						onEntryTextChange(entryIndex, event.target.value)
					}
					placeholder="What players see for this slot"
					value={text}
				/>
			</Field>

			<Field
				error={getFieldError("entries", entryIndex, "explanation")}
				htmlFor="entry-explanation"
				label="Explanation"
			>
				<TextInput
					id="entry-explanation"
					invalid={Boolean(getFieldError("entries", entryIndex, "explanation"))}
					onChange={(event) =>
						onEntryExplanationChange(entryIndex, event.target.value)
					}
					placeholder="Optional explanation shown after answering"
					value={explanation ?? ""}
				/>
			</Field>

			{children}
		</div>
	);
}
