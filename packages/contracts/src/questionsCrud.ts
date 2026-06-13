import z from "zod";
import { defineContractTree } from "./initContracts.ts";

const optionalExplanationSchema = z.preprocess(
	(value) =>
		typeof value === "string" && value.trim().length === 0 ? undefined : value,
	z.string().trim().min(1).optional(),
);

const uniqueTrimmedStrings = (items: string[]) =>
	new Set(items.map((item) => item.trim().toLowerCase())).size === items.length;

const nonEmptyTrimmedStringSchema = z.string().trim().min(1);

export const triviaCardDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const triviaCardFormatSchema = z.enum([
	"MULTIPLE_CHOICE",
	"TRUE_OR_FALSE",
	"OPEN_ENDED",
	"ORDER_ITEMS",
]);
export const triviaCardUiHintSchema = z.enum(["country"]);

export const triviaTagSchema = nonEmptyTrimmedStringSchema;
export const triviaCardIdSchema = z.coerce.number().int().positive();

const baseEntrySchema = z.object({
	text: nonEmptyTrimmedStringSchema,
	explanation: optionalExplanationSchema,
});

export const multipleChoiceEntryInputSchema = baseEntrySchema.extend({
	answer: nonEmptyTrimmedStringSchema,
});

export const trueOrFalseEntryInputSchema = baseEntrySchema.extend({
	answer: z.boolean(),
});

export const openEndedEntryInputSchema = baseEntrySchema.extend({
	answer: z
		.array(nonEmptyTrimmedStringSchema)
		.min(1)
		.refine(uniqueTrimmedStrings, "Accepted answers must be unique"),
});

export const orderItemsEntryInputSchema = baseEntrySchema.extend({
	answer: z.number().int().positive(),
});

const baseCardSchema = z.object({
	prompt: nonEmptyTrimmedStringSchema,
	difficulty: triviaCardDifficultySchema,
	tags: z
		.array(triviaTagSchema)
		.refine(uniqueTrimmedStrings, "Tags must be unique"),
});

const multipleChoiceQuestionCardInputSchema = baseCardSchema
	.extend({
		format: z.literal("MULTIPLE_CHOICE"),
		choices: z
			.array(nonEmptyTrimmedStringSchema)
			.min(2)
			.refine(uniqueTrimmedStrings, "Choices must be unique"),
		entries: z.array(multipleChoiceEntryInputSchema).min(2).max(10),
	})
	.superRefine((value, context) => {
		value.entries.forEach((entry, index) => {
			if (!value.choices.includes(entry.answer)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Answer must match one of the choices",
					path: ["entries", index, "answer"],
				});
			}
		});
	});

const trueOrFalseQuestionCardInputSchema = baseCardSchema.extend({
	format: z.literal("TRUE_OR_FALSE"),
	entries: z.array(trueOrFalseEntryInputSchema).min(2).max(10),
});

const openEndedQuestionCardInputSchema = baseCardSchema.extend({
	format: z.literal("OPEN_ENDED"),
	uiHint: triviaCardUiHintSchema.optional(),
	entries: z.array(openEndedEntryInputSchema).min(2).max(10),
});

const orderItemsQuestionCardInputSchema = baseCardSchema
	.extend({
		format: z.literal("ORDER_ITEMS"),
		entries: z.array(orderItemsEntryInputSchema).min(2).max(10),
	})
	.superRefine((value, context) => {
		const answers = value.entries.map((entry) => entry.answer);
		const expectedAnswers = new Set(
			Array.from({ length: value.entries.length }, (_, index) => index + 1),
		);

		if (answers.length !== new Set(answers).size) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Order answers must be unique",
				path: ["entries"],
			});
		}

		answers.forEach((answer, index) => {
			if (!expectedAnswers.has(answer)) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Answer must be between 1 and ${value.entries.length}`,
					path: ["entries", index, "answer"],
				});
			}
		});
	});

export const questionCardInputSchema = z.discriminatedUnion("format", [
	multipleChoiceQuestionCardInputSchema,
	trueOrFalseQuestionCardInputSchema,
	openEndedQuestionCardInputSchema,
	orderItemsQuestionCardInputSchema,
]);

export const questionCardSchema = z.discriminatedUnion("format", [
	multipleChoiceQuestionCardInputSchema.extend({
		id: z.number().int().positive(),
	}),
	trueOrFalseQuestionCardInputSchema.extend({
		id: z.number().int().positive(),
	}),
	openEndedQuestionCardInputSchema.extend({
		id: z.number().int().positive(),
	}),
	orderItemsQuestionCardInputSchema.extend({
		id: z.number().int().positive(),
	}),
]);

export type QuestionCardInput = z.infer<typeof questionCardInputSchema>;
export type QuestionCard = z.infer<typeof questionCardSchema>;
export type TriviaCardDifficulty = z.infer<typeof triviaCardDifficultySchema>;
export type TriviaCardFormat = z.infer<typeof triviaCardFormatSchema>;

export default defineContractTree({
	questionsCrud: {
		list: {
			path: "/questions",
			method: "GET",
			response: z.array(questionCardSchema),
		},
		getById: {
			path: "/questions/:id",
			method: "GET",
			request: {
				params: z.object({
					id: triviaCardIdSchema,
				}),
			},
			response: questionCardSchema,
		},
		create: {
			path: "/questions",
			method: "POST",
			request: {
				body: questionCardInputSchema,
			},
			response: questionCardSchema,
		},
		update: {
			path: "/questions/:id",
			method: "PUT",
			request: {
				params: z.object({
					id: triviaCardIdSchema,
				}),
				body: questionCardInputSchema,
			},
			response: questionCardSchema,
		},
		delete: {
			path: "/questions/:id",
			method: "DELETE",
			request: {
				params: z.object({
					id: triviaCardIdSchema,
				}),
			},
			response: questionCardSchema,
		},
	},
});
