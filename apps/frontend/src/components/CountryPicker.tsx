"use client";

import { countries } from "countries-list";
import { useMemo, useState } from "react";
import {
	formatCountryDisplay,
	getCountryLabel,
	getFlagEmoji,
	stripLeadingFlagEmoji,
} from "./countryDisplay";
import { Button } from "./ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from "./ui/combobox";

type CountryPickerProps = {
	className?: string;
	disabled?: boolean;
	id?: string;
	name?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	value?: string;
};

type CountryOption = {
	code: string;
	value: string;
	label: string;
	searchText: string;
};

export function CountryPicker({
	className,
	disabled = false,
	id,
	name,
	onChange,
	placeholder = "Select a country",
	value,
}: CountryPickerProps) {
	const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

	const options = useMemo<CountryOption[]>(() => {
		const countryCodes = Object.keys(countries);
		return countryCodes
			.map((countryCode) => countryCode.toUpperCase())
			.map((countryCode) => {
				const label = getCountryLabel(countryCode);
				const flagEmoji = getFlagEmoji(countryCode);
				const decoratedLabel = formatCountryDisplay(countryCode);

				return {
					code: countryCode.toLowerCase(),
					value: countryCode,
					label,
					searchText: [
						countryCode,
						label,
						flagEmoji,
						decoratedLabel,
						stripLeadingFlagEmoji(decoratedLabel),
					].join(" "),
				};
			})
			.sort((first, second) => first.label.localeCompare(second.label));
	}, []);

	const selectedOption =
		options.find((option) => option.value === value?.toUpperCase()) ?? null;

	const portalContainer =
		(rootElement?.closest('[role="dialog"]') as HTMLElement | null) ??
		undefined;

	return (
		<div ref={setRootElement}>
			<Combobox
				items={options}
				disabled={disabled}
				id={id}
				itemToStringLabel={(item) => item.label}
				name={name}
				onValueChange={(nextValue) => {
					if (nextValue) {
						onChange(nextValue.value);
					}
				}}
				filter={(item, query) =>
					item.searchText.toLowerCase().includes(query.trim().toLowerCase())
				}
				value={selectedOption}
			>
				<ComboboxTrigger
					render={
						<Button
							className={`w-full justify-between ${className ?? ""}`}
							variant="outline"
						>
							<span className="truncate text-left font-normal">
								{selectedOption
									? formatCountryDisplay(selectedOption.value)
									: placeholder}
							</span>
						</Button>
					}
				/>
				<ComboboxContent
					collisionAvoidance={{
						side: "shift",
						align: "shift",
						fallbackAxisSide: "none",
					}}
					container={portalContainer}
				>
					<ComboboxInput
						placeholder="Search countries..."
						showTrigger={false}
					/>
					<ComboboxEmpty>No countries match your search.</ComboboxEmpty>
					<ComboboxList>
						{(item) => (
							<ComboboxItem key={item.value} value={item}>
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<span className="shrink-0">{getFlagEmoji(item.value)}</span>
									<span className="truncate">{item.label}</span>
								</div>
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</div>
	);
}
