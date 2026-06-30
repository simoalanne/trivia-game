import {
	MIN_ENTRIES_PER_CARD,
	type QuestionCard,
	type QuestionCardAnswerMode,
	type QuestionCardInput,
	questionCardInputSchema,
} from "@packages/contracts";

type QuestionCardEntryInput = QuestionCardInput["entries"][number];

type QuestionCardFormEntry = QuestionCardEntryInput & { id: string };
type QuestionCardBaseValues = {
	prompt: string;
	difficulty: QuestionCardInput["difficulty"];
	tags: string[];
	entries: QuestionCardFormEntry[];
};

export type QuestionCardFormState =
	| (QuestionCardBaseValues & { answerMode: "TEXT" })
	| (QuestionCardBaseValues & { answerMode: "COUNTRY" })
	| (QuestionCardBaseValues & {
			answerMode: "CHOICES";
			choices: string[];
			choicesAreUnique: boolean;
	  });

export const createEntry = (
	overrides: Partial<QuestionCardEntryInput> = {},
): QuestionCardFormState["entries"][number] => ({
	id: crypto.randomUUID(),
	text: "",
	answer: "",
	...overrides,
});

export const createDefaultFormState = (
	answerMode: QuestionCardAnswerMode = "TEXT",
): QuestionCardFormState => {
	const baseValues = {
		prompt: "",
		difficulty: "EASY" as const,
		tags: [],
		entries: Array.from({ length: MIN_ENTRIES_PER_CARD }, () => createEntry()),
	};

	if (answerMode === "CHOICES") {
		return {
			...baseValues,
			answerMode: "CHOICES",
			choices: [],
			choicesAreUnique: false,
		};
	}

	return {
		...baseValues,
		answerMode,
	};
};

export const createTrueOrFalseTemplateFormState =
	(): QuestionCardFormState => ({
		prompt: "True or false:",
		difficulty: "EASY",
		answerMode: "CHOICES",
		tags: [],
		choices: ["True", "False"],
		choicesAreUnique: false,
		entries: [
			createEntry({ text: "Statement 1", answer: "True" }),
			createEntry({ text: "Statement 2", answer: "False" }),
		],
	});

export const createOrderItemsTemplateFormState = (): QuestionCardFormState => ({
	prompt: "Put these items in the correct order:",
	difficulty: "EASY",
	answerMode: "CHOICES",
	tags: [],
	choices: ["1", "2", "3", "4", "5"],
	choicesAreUnique: true,
	entries: [
		createEntry({ text: "First item", answer: "1" }),
		createEntry({ text: "Second item", answer: "2" }),
		createEntry({ text: "Third item", answer: "3" }),
		createEntry({ text: "Fourth item", answer: "4" }),
		createEntry({ text: "Fifth item", answer: "5" }),
	],
});

export const createFormStateFromQuestion = (
	question: QuestionCard,
): QuestionCardFormState => {
	const baseValues = {
		prompt: question.prompt,
		difficulty: question.difficulty,
		tags: [...question.tags],
		entries: question.entries.map((entry) => createEntry(entry)),
	};

	if (question.answerMode === "CHOICES") {
		return {
			...baseValues,
			answerMode: "CHOICES",
			choices: [...question.choices],
			choicesAreUnique: question.choicesAreUnique,
		};
	}

	return {
		...baseValues,
		answerMode: question.answerMode,
	};
};

export const createFormStateFromQuestionInput = (
	question: QuestionCardInput,
): QuestionCardFormState => {
	const baseValues = {
		prompt: question.prompt,
		difficulty: question.difficulty,
		tags: [...question.tags],
		entries: question.entries.map((entry) => createEntry(entry)),
	};

	if (question.answerMode === "CHOICES") {
		return {
			...baseValues,
			answerMode: "CHOICES",
			choices: [...question.choices],
			choicesAreUnique: question.choicesAreUnique,
		};
	}

	return {
		...baseValues,
		answerMode: question.answerMode,
	};
};

export const changeAnswerMode = (
	formState: QuestionCardFormState,
	answerMode: QuestionCardAnswerMode,
): QuestionCardFormState => {
	if (formState.answerMode === answerMode) {
		return formState;
	}

	const baseValues = {
		prompt: formState.prompt,
		difficulty: formState.difficulty,
		tags: [...formState.tags],
		entries: formState.entries.map((entry) => ({
			...entry,
			answer: answerMode === "CHOICES" ? "" : entry.answer,
		})),
	};

	if (answerMode === "CHOICES") {
		return {
			...baseValues,
			answerMode: "CHOICES",
			choices: [],
			choicesAreUnique: false,
		};
	}

	return {
		...baseValues,
		answerMode,
	};
};

export const validateQuestionCardForm = (formState: QuestionCardFormState) =>
	questionCardInputSchema.safeParse(formState);

export const mapZodErrors = (formState: QuestionCardFormState) => {
	const result = validateQuestionCardForm(formState);

	if (result.success) {
		return {};
	}

	return Object.fromEntries(
		result.error.issues.map((issue) => [
			issue.path.join(".") || "_root",
			issue.message,
		]),
	);
};
