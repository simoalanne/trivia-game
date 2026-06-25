"use client";

const fallbackCountryLabel = (countryCode: string) => countryCode.toUpperCase();
const isValidCountryCode = (countryCode: string) =>
	/^[A-Z]{2}$/.test(countryCode.trim().toUpperCase());

const getBrowserLocales = () => {
	if (typeof navigator === "undefined") {
		return ["en"];
	}

	return navigator.languages.length > 0 ? navigator.languages : ["en"];
};

export const getFlagEmoji = (countryCode: string) => {
	const normalizedCode = countryCode.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(normalizedCode)) {
		return "";
	}

	return Array.from(normalizedCode)
		.map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
		.join("");
};

export const getCountryLabel = (countryCode: string) =>
	(() => {
		const normalizedCode = countryCode.trim().toUpperCase();

		if (!isValidCountryCode(normalizedCode)) {
			return fallbackCountryLabel(countryCode);
		}

		try {
			return (
				new Intl.DisplayNames(getBrowserLocales(), {
					type: "region",
				}).of(normalizedCode) ?? fallbackCountryLabel(countryCode)
			);
		} catch {
			return fallbackCountryLabel(countryCode);
		}
	})();

export const formatCountryDisplay = (countryCode: string) => {
	const label = getCountryLabel(countryCode);
	const flagEmoji = getFlagEmoji(countryCode);

	return `${flagEmoji ? `${flagEmoji} ` : ""}${label}`;
};

export const stripLeadingFlagEmoji = (value: string) =>
	value.replace(/^\p{Regional_Indicator}{2}\s*/u, "").trimStart();
