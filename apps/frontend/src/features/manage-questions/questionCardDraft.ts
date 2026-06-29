import type {
	QuestionCard,
	QuestionCardInput,
	TriviaCardFormat,
} from "@packages/contracts";
import {
	MAX_MULTIPLE_CHOICE_CHOICES,
	MAX_TAGS_PER_CARD,
	MIN_MULTIPLE_CHOICE_CHOICES,
} from "@packages/contracts";

type MultipleChoiceQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "MULTIPLE_CHOICE" }
>;
type TrueOrFalseQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "TRUE_OR_FALSE" }
>;
type OpenEndedQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "OPEN_ENDED" }
>;
type OrderItemsQuestionCardInput = Extract<
	QuestionCardInput,
	{ format: "ORDER_ITEMS" }
>;

const normalizeDraftListValue = (value: string) => value.trim().toLowerCase();
const DEFAULT_COUNTRY_ANSWER_CODES = ["FI", "GB"] as const;
const isValidCountryAnswerCode = (value: string) =>
	/^[A-Z]{2}$/.test(value.trim().toUpperCase());

const getDefaultOpenEndedAnswers = (uiHint?: "country") =>
	uiHint === "country" ? [DEFAULT_COUNTRY_ANSWER_CODES[0]] : [""];

export const createDefaultMultipleChoiceChoices = (
	count = MIN_MULTIPLE_CHOICE_CHOICES,
	existingChoices: string[] = [],
) => {
	const usedChoices = new Set(existingChoices.map(normalizeDraftListValue));
	const nextChoices: string[] = [];
	let choiceNumber = 1;

	while (nextChoices.length < count) {
		const candidate = `Choice ${choiceNumber}`;
		choiceNumber += 1;

		if (usedChoices.has(normalizeDraftListValue(candidate))) {
			continue;
		}

		usedChoices.add(normalizeDraftListValue(candidate));
		nextChoices.push(candidate);
	}

	return nextChoices;
};

const getSharedCardState = (card: QuestionCardInput | QuestionCard) => ({
	prompt: card.prompt,
	difficulty: card.difficulty,
	tags: [...card.tags],
	...(card.format === "OPEN_ENDED" && card.uiHint
		? { uiHint: card.uiHint }
		: {}),
});

const getSharedEntryState = (
	card: QuestionCardInput | QuestionCard,
	entryIndex: number,
) => {
	const entry = card.entries[entryIndex];

	return {
		text: entry?.text ?? "",
	};
};

export const createEmptyQuestionCard = (
	format: TriviaCardFormat = "MULTIPLE_CHOICE",
	entryCount = 2,
): QuestionCardInput => {
	const baseCard = {
		prompt: "",
		difficulty: "EASY" as const,
		tags: [],
	};

	switch (format) {
		case "TRUE_OR_FALSE":
			return {
				...baseCard,
				format,
				entries: Array.from({ length: entryCount }, () => ({
					text: "",
					answer: true,
				})),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				...baseCard,
				format,
				uiHint: undefined,
				entries: Array.from({ length: entryCount }, () => ({
					text: "",
					answer: getDefaultOpenEndedAnswers(),
				})),
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				...baseCard,
				format,
				entries: Array.from({ length: entryCount }, (_, index) => ({
					text: "",
					answer: index + 1,
				})),
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				...baseCard,
				format: "MULTIPLE_CHOICE",
				choices: createDefaultMultipleChoiceChoices(),
				entries: Array.from({ length: entryCount }, () => ({
					text: "",
					answer: "",
				})),
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

export const changeQuestionCardFormat = (
	card: QuestionCardInput,
	format: TriviaCardFormat,
): QuestionCardInput => {
	const entryCount = Math.min(Math.max(card.entries.length, 2), 10);
	const sharedCard = getSharedCardState(card);

	switch (format) {
		case "TRUE_OR_FALSE":
			return {
				...sharedCard,
				format,
				entries: Array.from({ length: entryCount }, (_, index) => ({
					...getSharedEntryState(card, index),
					answer: true,
				})),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				...sharedCard,
				format,
				uiHint: card.format === "OPEN_ENDED" ? card.uiHint : undefined,
				entries: Array.from({ length: entryCount }, (_, index) => ({
					...getSharedEntryState(card, index),
					answer: getDefaultOpenEndedAnswers(
						card.format === "OPEN_ENDED" && card.uiHint === "country"
							? "country"
							: undefined,
					),
				})),
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				...sharedCard,
				format,
				entries: Array.from({ length: entryCount }, (_, index) => ({
					...getSharedEntryState(card, index),
					answer: index + 1,
				})),
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				...sharedCard,
				format: "MULTIPLE_CHOICE",
				choices:
					card.format === "MULTIPLE_CHOICE" &&
					card.choices.length >= MIN_MULTIPLE_CHOICE_CHOICES
						? [...card.choices]
						: createDefaultMultipleChoiceChoices(),
				entries: Array.from({ length: entryCount }, (_, index) => ({
					...getSharedEntryState(card, index),
					answer: "",
				})),
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

export const toQuestionCardInput = (card: QuestionCard): QuestionCardInput => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				prompt: card.prompt,
				difficulty: card.difficulty,
				tags: [...card.tags],
				format: card.format,
				entries: card.entries.map((entry) => ({
					text: entry.text,
					answer: entry.answer,
				})),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				prompt: card.prompt,
				difficulty: card.difficulty,
				tags: [...card.tags],
				format: card.format,
				uiHint: card.uiHint,
				entries: card.entries.map((entry) => ({
					text: entry.text,
					answer: [...entry.answer],
				})),
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				prompt: card.prompt,
				difficulty: card.difficulty,
				tags: [...card.tags],
				format: card.format,
				entries: card.entries.map((entry) => ({
					text: entry.text,
					answer: entry.answer,
				})),
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				prompt: card.prompt,
				difficulty: card.difficulty,
				tags: [...card.tags],
				format: "MULTIPLE_CHOICE",
				choices: [...card.choices],
				entries: card.entries.map((entry) => ({
					text: entry.text,
					answer: entry.answer,
				})),
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

export const addEntryToQuestionCard = (
	card: QuestionCardInput,
): QuestionCardInput => {
	if (card.entries.length >= 10) {
		return card;
	}

	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				...card,
				entries: [...card.entries, { text: "", answer: true }],
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				...card,
				entries: [
					...card.entries,
					{
						text: "",
						answer: getDefaultOpenEndedAnswers(
							card.uiHint === "country" ? "country" : undefined,
						),
					},
				],
			} satisfies OpenEndedQuestionCardInput;
		case "ORDER_ITEMS":
			return {
				...card,
				entries: [
					...card.entries,
					{ text: "", answer: card.entries.length + 1 },
				],
			} satisfies OrderItemsQuestionCardInput;
		case "MULTIPLE_CHOICE":
		default:
			return {
				...card,
				entries: [...card.entries, { text: "", answer: "" }],
			} satisfies MultipleChoiceQuestionCardInput;
	}
};

export const updateOpenEndedQuestionCardUiHint = (
	card: OpenEndedQuestionCardInput,
	uiHint: OpenEndedQuestionCardInput["uiHint"],
): OpenEndedQuestionCardInput => ({
	...card,
	uiHint,
	entries: card.entries.map((entry) => {
		if (uiHint !== "country") {
			return entry;
		}

		const validAnswers = entry.answer
			.map((answer) => answer.trim().toUpperCase())
			.filter(isValidCountryAnswerCode);

		return {
			...entry,
			answer: validAnswers.length > 0 ? validAnswers : ["FI"],
		};
	}),
});

export const addChoiceToQuestionCard = (
	card: MultipleChoiceQuestionCardInput,
): MultipleChoiceQuestionCardInput => {
	if (card.choices.length >= MAX_MULTIPLE_CHOICE_CHOICES) {
		return card;
	}

	return {
		...card,
		choices: [
			...card.choices,
			...createDefaultMultipleChoiceChoices(1, card.choices),
		],
	};
};

export const addTagToQuestionCard = (
	card: QuestionCardInput,
): QuestionCardInput => {
	if (card.tags.length >= MAX_TAGS_PER_CARD) {
		return card;
	}

	return {
		...card,
		tags: [...card.tags, ""],
	};
};

export const removeEntryFromQuestionCard = (
	card: QuestionCardInput,
	entryIndex: number,
): QuestionCardInput => {
	if (card.entries.length <= 2) {
		return card;
	}

	if (card.format === "ORDER_ITEMS") {
		const remainingEntries = card.entries.filter(
			(_, index) => index !== entryIndex,
		);

		return {
			...card,
			entries: remainingEntries.map((entry, index) => ({
				...entry,
				answer: index + 1,
			})),
		} satisfies OrderItemsQuestionCardInput;
	}

	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				...card,
				entries: card.entries.filter((_, index) => index !== entryIndex),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				...card,
				entries: card.entries.filter((_, index) => index !== entryIndex),
			} satisfies OpenEndedQuestionCardInput;
		case "MULTIPLE_CHOICE":
			return {
				...card,
				entries: card.entries.filter((_, index) => index !== entryIndex),
			} satisfies MultipleChoiceQuestionCardInput;
		default:
			return card;
	}
};
