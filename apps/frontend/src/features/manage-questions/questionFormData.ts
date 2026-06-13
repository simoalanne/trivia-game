import type {
	QuestionCard,
	QuestionCardInput,
	TriviaCardFormat,
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

const getSharedCardState = (card: QuestionCardInput | QuestionCard) => ({
	prompt: card.prompt,
	difficulty: card.difficulty,
	tags: [...card.tags],
});

const getSharedEntryState = (
	card: QuestionCardInput | QuestionCard,
	entryIndex: number,
) => {
	const entry = card.entries[entryIndex];

	return {
		text: entry?.text ?? "",
		explanation: entry?.explanation,
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
				entries: Array.from({ length: entryCount }, () => ({
					text: "",
					answer: [""],
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
				choices: ["", ""],
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
				entries: Array.from({ length: entryCount }, (_, index) => ({
					...getSharedEntryState(card, index),
					answer: [""],
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
					card.format === "MULTIPLE_CHOICE" && card.choices.length >= 2
						? [...card.choices]
						: ["", ""],
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
					explanation: entry.explanation,
				})),
			} satisfies TrueOrFalseQuestionCardInput;
		case "OPEN_ENDED":
			return {
				prompt: card.prompt,
				difficulty: card.difficulty,
				tags: [...card.tags],
				format: card.format,
				entries: card.entries.map((entry) => ({
					text: entry.text,
					answer: [...entry.answer],
					explanation: entry.explanation,
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
					explanation: entry.explanation,
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
					explanation: entry.explanation,
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
				entries: [...card.entries, { text: "", answer: [""] }],
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
