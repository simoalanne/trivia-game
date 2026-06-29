import { cn } from "@/lib/utils";

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
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
			{options.map((option, index) => (
				<button
					aria-pressed={value === option.value}
					className={cn(
						"btn min-h-12 whitespace-normal",
						value === option.value ? "btn-primary" : "btn-outline",
					)}
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
