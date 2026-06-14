"use client";

import {
	type KeyboardEvent,
	type ReactNode,
	useDeferredValue,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import styles from "./SearchableDropdown.module.css";

export type SearchableDropdownOption = {
	value: string;
	label: string;
	searchText?: string;
};

export type SearchableDropdownClassNames = {
	root?: string;
	control?: string;
	value?: string;
	placeholder?: string;
	chevron?: string;
	popover?: string;
	searchInput?: string;
	options?: string;
	option?: string;
	optionSelected?: string;
	message?: string;
};

type SearchableDropdownProps = {
	className?: string;
	classNames?: SearchableDropdownClassNames;
	disabled?: boolean;
	emptyMessage?: string;
	id?: string;
	invalid?: boolean;
	loading?: boolean;
	loadingMessage?: string;
	name?: string;
	noResultsMessage?: string;
	onChange: (value: string) => void;
	options: SearchableDropdownOption[];
	placeholder?: string;
	renderOption?: (option: SearchableDropdownOption) => ReactNode;
	renderValue?: (option: SearchableDropdownOption) => ReactNode;
	searchPlaceholder?: string;
	value?: string;
};

const cx = (...classNames: Array<string | false | undefined>) =>
	classNames.filter(Boolean).join(" ");

export function SearchableDropdown({
	className,
	classNames,
	disabled = false,
	emptyMessage = "No options available.",
	id,
	invalid = false,
	loading = false,
	loadingMessage = "Loading options...",
	name,
	noResultsMessage = "No matches found.",
	onChange,
	options,
	placeholder = "Select an option",
	renderOption,
	renderValue,
	searchPlaceholder = "Search...",
	value,
}: SearchableDropdownProps) {
	const generatedId = useId();
	const controlId = id ?? generatedId;
	const listboxId = `${controlId}-listbox`;
	const searchInputId = `${controlId}-search`;
	const rootRef = useRef<HTMLDivElement | null>(null);
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const selectedOption = useMemo(
		() => options.find((option) => option.value === value),
		[options, value],
	);

	const filteredOptions = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) {
			return options;
		}

		return options.filter((option) => {
			const searchableContent = [
				option.label,
				option.value,
				option.searchText ?? "",
			]
				.join(" ")
				.toLowerCase();
			return searchableContent.includes(normalizedQuery);
		});
	}, [deferredQuery, options]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		searchInputRef.current?.focus();

		const handlePointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setIsOpen(false);
				setQuery("");
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
		};
	}, [isOpen]);

	const handleToggle = () => {
		if (disabled) {
			return;
		}

		setIsOpen((current) => {
			const next = !current;
			if (!next) {
				setQuery("");
			}
			return next;
		});
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) {
			return;
		}

		if (
			event.key === "ArrowDown" ||
			event.key === "Enter" ||
			event.key === " "
		) {
			event.preventDefault();
			setIsOpen(true);
		}
	};

	const handleSelect = (nextValue: string) => {
		onChange(nextValue);
		setIsOpen(false);
		setQuery("");
	};

	return (
		<div className={cx(styles.root, className, classNames?.root)} ref={rootRef}>
			{name ? <input name={name} type="hidden" value={value ?? ""} /> : null}
			<button
				aria-controls={listboxId}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-invalid={invalid || undefined}
				className={cx(
					styles.control,
					invalid && styles.controlInvalid,
					disabled && styles.controlDisabled,
					classNames?.control,
				)}
				disabled={disabled}
				id={controlId}
				onClick={handleToggle}
				onKeyDown={handleKeyDown}
				type="button"
			>
				<span
					className={cx(
						styles.value,
						classNames?.value,
						!selectedOption && styles.placeholder,
						!selectedOption && classNames?.placeholder,
					)}
				>
					{selectedOption
						? (renderValue?.(selectedOption) ?? selectedOption.label)
						: placeholder}
				</span>
				<span
					aria-hidden="true"
					className={cx(styles.chevron, classNames?.chevron)}
				>
					▾
				</span>
			</button>

			{isOpen ? (
				<div className={cx(styles.popover, classNames?.popover)}>
					<input
						autoComplete="off"
						className={cx(styles.searchInput, classNames?.searchInput)}
						id={searchInputId}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={searchPlaceholder}
						ref={searchInputRef}
						value={query}
					/>
					<div
						aria-labelledby={controlId}
						className={cx(styles.options, classNames?.options)}
						id={listboxId}
						role="listbox"
					>
						{loading ? (
							<p className={cx(styles.message, classNames?.message)}>
								{loadingMessage}
							</p>
						) : options.length === 0 ? (
							<p className={cx(styles.message, classNames?.message)}>
								{emptyMessage}
							</p>
						) : filteredOptions.length === 0 ? (
							<p className={cx(styles.message, classNames?.message)}>
								{noResultsMessage}
							</p>
						) : (
							filteredOptions.map((option) => {
								const isSelected = option.value === value;
								return (
									<button
										aria-selected={isSelected}
										className={cx(
											styles.option,
											isSelected && styles.optionSelected,
											classNames?.option,
											isSelected && classNames?.optionSelected,
										)}
										key={option.value}
										onClick={() => handleSelect(option.value)}
										role="option"
										type="button"
									>
										{renderOption?.(option) ?? option.label}
									</button>
								);
							})
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
