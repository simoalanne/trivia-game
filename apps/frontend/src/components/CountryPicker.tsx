"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { countries } from "countries-list";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
	formatCountryDisplay,
	getCountryLabel,
	getFlagEmoji,
	stripLeadingFlagEmoji,
} from "./countryDisplay";

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
			<ComboboxPrimitive.Root
				items={options}
				disabled={disabled}
				id={id}
				itemToStringLabel={(item) => item?.label ?? ""}
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
				<ComboboxPrimitive.Trigger
					render={
						<button
							className={cn(
								"btn btn-outline w-full justify-between",
								className,
							)}
							disabled={disabled}
							type="button"
						>
							<span className="truncate text-left font-normal">
								{selectedOption
									? formatCountryDisplay(selectedOption.value)
									: placeholder}
							</span>
							<ChevronDownIcon
								aria-hidden="true"
								className="size-4 shrink-0 text-base-content/60"
							/>
						</button>
					}
				></ComboboxPrimitive.Trigger>
				<ComboboxPrimitive.Portal container={portalContainer}>
					<ComboboxPrimitive.Positioner
						align="start"
						alignOffset={0}
						collisionAvoidance={{
							side: "shift",
							align: "shift",
							fallbackAxisSide: "none",
						}}
						side="bottom"
						sideOffset={6}
						className="isolate z-50"
					>
						<ComboboxPrimitive.Popup className="relative w-(--anchor-width) min-w-[16rem] overflow-hidden rounded-(--radius-box) border border-base-300 bg-base-100 text-base-content shadow-xl">
							<div className="p-1 pb-0">
								<ComboboxPrimitive.Input
									placeholder="Search countries..."
									render={
										<input className="input w-full" disabled={disabled} />
									}
								/>
							</div>
							<ComboboxPrimitive.Empty className="hidden w-full justify-center px-3 py-3 text-center text-sm text-base-content/60 group-data-empty/picker:flex">
								No countries match your search.
							</ComboboxPrimitive.Empty>
							<ComboboxPrimitive.List className="group/picker max-h-72 overflow-y-auto p-1">
								{(item) => (
									<ComboboxPrimitive.Item
										key={item.value}
										value={item}
										className="relative flex w-full cursor-default items-center gap-2 rounded-(--radius-field) px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-base-200 data-disabled:pointer-events-none data-disabled:opacity-50"
									>
										<div className="flex min-w-0 flex-1 items-center gap-2">
											<span className="shrink-0">
												{getFlagEmoji(item.value)}
											</span>
											<span className="truncate">{item.label}</span>
										</div>
										<ComboboxPrimitive.ItemIndicator
											render={
												<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
											}
										>
											<CheckIcon aria-hidden="true" className="size-4" />
										</ComboboxPrimitive.ItemIndicator>
									</ComboboxPrimitive.Item>
								)}
							</ComboboxPrimitive.List>
						</ComboboxPrimitive.Popup>
					</ComboboxPrimitive.Positioner>
				</ComboboxPrimitive.Portal>
			</ComboboxPrimitive.Root>
		</div>
	);
}
