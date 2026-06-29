"use client";

import type { ReactNode } from "react";

type QuestionEntryEditorLayoutProps = {
	children: ReactNode;
	entryIndex: number;
	getFieldError: (...prefix: Array<string | number>) => string | undefined;
	onEntryTextChange: (entryIndex: number, value: string) => void;
	prompt: string;
	text: string;
};

export default function QuestionEntryEditorLayout({
	children,
	entryIndex,
	getFieldError,
	onEntryTextChange,
	prompt,
	text,
}: QuestionEntryEditorLayoutProps) {
	return (
		<div className="grid content-start gap-4">
			<p className="text-sm text-base-content/70">
				{prompt.trim() || "Set a card prompt from the center of the wheel."}
			</p>

			<fieldset className="fieldset w-full gap-2">
				<label
					className="fieldset-legend text-sm font-semibold"
					htmlFor="entry-text"
				>
					{`Entry ${entryIndex + 1} text`}
				</label>
				<input
					aria-invalid={
						Boolean(getFieldError("entries", entryIndex, "text")) || undefined
					}
					className={`input w-full ${
						getFieldError("entries", entryIndex, "text") ? "input-error" : ""
					}`}
					id="entry-text"
					onChange={(event) =>
						onEntryTextChange(entryIndex, event.target.value)
					}
					placeholder="What players see for this slot"
					value={text}
				/>
				{getFieldError("entries", entryIndex, "text") ? (
					<p className="label px-0 text-sm font-semibold text-error">
						{getFieldError("entries", entryIndex, "text")}
					</p>
				) : null}
			</fieldset>

			{children}
		</div>
	);
}
