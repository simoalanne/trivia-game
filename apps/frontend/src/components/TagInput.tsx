"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TagInputProps = {
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	disabled?: boolean;
	invalid?: boolean;
	maxItems?: number;
	allowDuplicates?: boolean;
	normalizeValue?: (value: string) => string;
};

export function TagInput({
	values,
	onChange,
	placeholder = "Type and press Enter",
	disabled = false,
	invalid = false,
	maxItems,
	allowDuplicates = false,
	normalizeValue,
}: TagInputProps) {
	const [draft, setDraft] = useState("");
	const containerRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const canAddMore = maxItems === undefined || values.length < maxItems;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			if (disabled) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			if (target.closest("button, input, select, textarea, a")) {
				return;
			}

			event.preventDefault();
			inputRef.current?.focus();
		};

		container.addEventListener("pointerdown", handlePointerDown);

		return () => {
			container.removeEventListener("pointerdown", handlePointerDown);
		};
	}, [disabled]);

	const commitDraft = () => {
		const trimmed = draft.trim();
		if (!trimmed || !canAddMore) {
			return;
		}

		const normalized = normalizeValue ? normalizeValue(trimmed) : trimmed;
		if (!normalized) {
			setDraft("");
			return;
		}

		if (!allowDuplicates && values.includes(normalized)) {
			setDraft("");
			return;
		}

		onChange([...values, normalized]);
		setDraft("");
	};

	const removeValue = (valueToRemove: string) => {
		onChange(values.filter((value) => value !== valueToRemove));
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				"flex min-h-12 min-w-0 w-full flex-wrap items-start gap-2 rounded-(--radius-field) border bg-base-100 px-3 py-2",
				invalid ? "border-error" : "border-base-300",
				disabled ? "opacity-60" : "",
			)}
		>
			{values.map((value) => (
				<div
					className="flex min-w-0 max-w-full shrink items-center gap-1 overflow-hidden rounded-full bg-base-200 px-3 py-1.5 text-sm leading-5"
					key={value}
				>
					<span className="min-w-0 truncate">{value}</span>
					<button
						aria-label={`Remove ${value}`}
						className="grid size-5 shrink-0 place-items-center rounded-full text-base-content/60 transition hover:bg-base-content/10 hover:text-base-content"
						disabled={disabled}
						onClick={() => removeValue(value)}
						type="button"
					>
						<X size={12} />
					</button>
				</div>
			))}

			{canAddMore ? (
				<input
					className="w-0 max-w-full flex-1 border-0 bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-base-content/40"
					disabled={disabled}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							commitDraft();
						}

						if (event.key === "Backspace" && !draft && values.length > 0) {
							onChange(values.slice(0, -1));
						}
					}}
					placeholder={values.length === 0 ? placeholder : "Add another"}
					ref={inputRef}
					type="text"
					value={draft}
				/>
			) : null}
		</div>
	);
}
