"use client";

import { useMemo } from "react";
import {
	SearchableDropdown,
	type SearchableDropdownClassNames,
	type SearchableDropdownOption,
} from "@/components/SearchableDropdown";
import { useApiClient } from "@/lib/apiClientProvider";

export type CountryPickerClassNames = SearchableDropdownClassNames;

type CountryPickerProps = {
	className?: string;
	classNames?: CountryPickerClassNames;
	disabled?: boolean;
	id?: string;
	invalid?: boolean;
	name?: string;
	onChange: (value: string) => void;
	placeholder?: string;
	searchPlaceholder?: string;
	value?: string;
};

const fallbackLabel = (countryCode: string) => countryCode.toUpperCase();

const getFlagEmoji = (countryCode: string) => {
	const normalizedCode = countryCode.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(normalizedCode)) {
		return "";
	}

	return Array.from(normalizedCode)
		.map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
		.join("");
};

const getBrowserLocales = () => {
	if (typeof navigator === "undefined") {
		return ["en"];
	}

	return navigator.languages.length > 0 ? navigator.languages : ["en"];
};

export function CountryPicker({
	className,
	classNames,
	disabled = false,
	id,
	invalid = false,
	name,
	onChange,
	placeholder = "Select a country",
	searchPlaceholder = "Search countries...",
	value,
}: CountryPickerProps) {
	const api = useApiClient();
	const countriesQuery = api.countries.list.useQuery();
	const locales = getBrowserLocales();

	const displayNames = useMemo(
		() => new Intl.DisplayNames(locales, { type: "region" }),
		[locales],
	);

	const options = useMemo<SearchableDropdownOption[]>(() => {
		const countryCodes = countriesQuery.data ?? [];

		return [...countryCodes]
			.map((countryCode) => countryCode.toUpperCase())
			.map((countryCode) => {
				const label =
					displayNames.of(countryCode) ?? fallbackLabel(countryCode);
				const flagEmoji = getFlagEmoji(countryCode);

				return {
					value: countryCode,
					label,
					searchText: `${countryCode} ${label} ${flagEmoji}`,
				};
			})
			.sort((first, second) =>
				first.label.localeCompare(second.label, locales[0]),
			);
	}, [countriesQuery.data, displayNames, locales]);

	return (
		<SearchableDropdown
			className={className}
			classNames={classNames}
			disabled={disabled}
			emptyMessage="No countries available."
			id={id}
			invalid={invalid}
			loading={countriesQuery.isLoading}
			loadingMessage="Loading countries..."
			name={name}
			noResultsMessage="No countries match your search."
			onChange={onChange}
			options={options}
			placeholder={placeholder}
			renderOption={(option) => {
				const flagEmoji = getFlagEmoji(option.value);
				return `${flagEmoji ? `${flagEmoji} ` : ""}${option.label}`;
			}}
			renderValue={(option) => {
				const flagEmoji = getFlagEmoji(option.value);
				return `${flagEmoji ? `${flagEmoji} ` : ""}${option.label}`;
			}}
			searchPlaceholder={searchPlaceholder}
			value={value?.toUpperCase()}
		/>
	);
}
