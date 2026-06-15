"use client";

import {
	type FocusEvent,
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
	value,
}: SearchableDropdownProps) {
	const generatedId = useId();
	const controlId = id ?? generatedId;
	const listboxId = `${controlId}-listbox`;
	const rootRef = useRef<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const deferredQuery = useDeferredValue(query);

	const selectedOption = useMemo(
		() => options.find((option) => option.value === value),
		[options, value],
	);
	const selectedDisplayValue = useMemo(() => {
		if (!selectedOption) {
			return "";
		}

		const renderedValue = renderValue?.(selectedOption);
		if (
			typeof renderedValue === "string" ||
			typeof renderedValue === "number"
		) {
			return String(renderedValue);
		}

		return selectedOption.label;
	}, [renderValue, selectedOption]);
	const inputValue = isOpen ? query : selectedDisplayValue;

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

	const openDropdown = () => {
		if (disabled) {
			return;
		}

		setIsOpen(true);
	};

	const handleInputFocus = () => {
		openDropdown();
		setQuery(selectedDisplayValue);
		setActiveIndex(0);
	};

	const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
		if (rootRef.current?.contains(event.relatedTarget as Node | null)) {
			return;
		}

		setIsOpen(false);
		setQuery("");
	};

	const handleInputChange = (nextQuery: string) => {
		setQuery(nextQuery);
		setActiveIndex(0);
		openDropdown();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (disabled) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setIsOpen(true);
			setActiveIndex((current) =>
				Math.min(current + 1, Math.max(filteredOptions.length - 1, 0)),
			);
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			setIsOpen(true);
			setActiveIndex((current) => Math.max(current - 1, 0));
			return;
		}

		if (event.key === "Enter" && isOpen) {
			const activeOption = filteredOptions[activeIndex];
			if (activeOption) {
				event.preventDefault();
				handleSelect(activeOption.value);
			}
			return;
		}

		if (event.key === "Escape") {
			setIsOpen(false);
			setQuery("");
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
			<div className={styles.inputWrap}>
				<input
					aria-activedescendant={
						isOpen && filteredOptions[activeIndex]
							? `${listboxId}-${filteredOptions[activeIndex].value}`
							: undefined
					}
					aria-controls={listboxId}
					aria-expanded={isOpen}
					aria-haspopup="listbox"
					aria-invalid={invalid || undefined}
					autoComplete="off"
					className={cx(
						styles.control,
						invalid && styles.controlInvalid,
						disabled && styles.controlDisabled,
						classNames?.control,
						classNames?.searchInput,
						!selectedOption && !isOpen && styles.placeholderInput,
						!selectedOption && !isOpen && classNames?.placeholder,
					)}
					disabled={disabled}
					id={controlId}
					onBlur={handleInputBlur}
					onChange={(event) => handleInputChange(event.target.value)}
					onClick={openDropdown}
					onFocus={handleInputFocus}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					role="combobox"
					type="text"
					value={inputValue}
				/>
				<span
					aria-hidden="true"
					className={cx(styles.chevron, classNames?.chevron)}
				>
					▾
				</span>
			</div>

			{isOpen ? (
				<div className={cx(styles.popover, classNames?.popover)}>
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
							filteredOptions.map((option, optionIndex) => {
								const isSelected = option.value === value;
								return (
									<button
										aria-selected={isSelected}
										className={cx(
											styles.option,
											optionIndex === activeIndex && styles.optionActive,
											isSelected && styles.optionSelected,
											classNames?.option,
											isSelected && classNames?.optionSelected,
										)}
										id={`${listboxId}-${option.value}`}
										key={option.value}
										onClick={() => handleSelect(option.value)}
										onMouseDown={(event) => event.preventDefault()}
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
