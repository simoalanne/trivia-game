import styles from "./ChipPicker.module.css";

type ChipOption = {
	label: string;
	value: string;
};

type ChipPickerProps = {
	options: ChipOption[];
	value: string | null;
	onChange: (value: string) => void;
	disabled?: boolean;
};

export function ChipPicker({
	options,
	value,
	onChange,
	disabled = false,
}: ChipPickerProps) {
	return (
		<div className={styles.grid}>
			{options.map((option, index) => (
				<button
					aria-pressed={value === option.value}
					className={`${styles.chip} ${
						value === option.value ? styles.selectedChip : ""
					}`}
					disabled={disabled}
					key={`${option.value}-${index}`}
					onClick={() => onChange(option.value)}
					type="button"
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
