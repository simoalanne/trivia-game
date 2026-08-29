import { customBody, router } from "@rest-rpc/core";
import z from "zod";

const uniqueTrimmedStrings = (items: string[]) =>
	new Set(items.map((item) => item.trim().toLowerCase())).size === items.length;

const nonEmptyTrimmedStringSchema = z.string().trim().min(1);

export const MAX_TAGS_PER_CARD = 5;
export const MIN_ENTRIES_PER_CARD = 2;
export const MAX_ENTRIES_PER_CARD = 10;

export const triviaCardDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export const questionCardAnswerModeSchema = z.enum([
	"TEXT",
	"CHOICES",
	"COUNTRY",
]);

export const triviaTagSchema = nonEmptyTrimmedStringSchema;
export const triviaCardIdSchema = z.coerce.number().int().positive();

const triviaEntryInputSchema = z.object({
	text: nonEmptyTrimmedStringSchema,
	answer: nonEmptyTrimmedStringSchema,
});

const baseCardSchema = z.object({
	prompt: nonEmptyTrimmedStringSchema,
	difficulty: triviaCardDifficultySchema,
	tags: z
		.array(triviaTagSchema)
		.max(MAX_TAGS_PER_CARD)
		.refine(uniqueTrimmedStrings, "Tags must be unique"),
	entries: z
		.array(triviaEntryInputSchema)
		.min(MIN_ENTRIES_PER_CARD)
		.max(MAX_ENTRIES_PER_CARD),
});

const textQuestionCardInputSchema = baseCardSchema.extend({
	answerMode: z.literal("TEXT"),
});

const countryQuestionCardInputSchema = baseCardSchema.extend({
	answerMode: z.literal("COUNTRY"),
});

const choicesQuestionCardInputSchema = baseCardSchema
	.extend({
		answerMode: z.literal("CHOICES"),
		choices: z
			.array(nonEmptyTrimmedStringSchema)
			.min(MIN_ENTRIES_PER_CARD)
			.max(MAX_ENTRIES_PER_CARD)
			.refine(uniqueTrimmedStrings, "Choices must be unique"),
		choicesAreUnique: z.boolean(),
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

		if (!value.choicesAreUnique) {
			return;
		}

		if (value.choices.length !== value.entries.length) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Unique choice cards must define one choice per entry",
				path: ["choices"],
			});
		}

		const answers = value.entries.map((entry) => entry.answer);
		if (answers.length !== new Set(answers).size) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Each answer must be used only once",
				path: ["entries"],
			});
		}
	});

export const questionCardInputSchema = z.discriminatedUnion("answerMode", [
	textQuestionCardInputSchema,
	countryQuestionCardInputSchema,
	choicesQuestionCardInputSchema,
]);

const baseQuestionCardSchema = z.object({
	id: z.number().int().positive(),
	updatedAt: z.string().datetime(),
});

export const questionCardSchema = z.discriminatedUnion("answerMode", [
	textQuestionCardInputSchema.extend(baseQuestionCardSchema.shape),
	countryQuestionCardInputSchema.extend(baseQuestionCardSchema.shape),
	choicesQuestionCardInputSchema.extend(baseQuestionCardSchema.shape),
]);

export type QuestionCardInput = z.infer<typeof questionCardInputSchema>;
export type QuestionCard = z.infer<typeof questionCardSchema>;
export type TriviaCardDifficulty = z.infer<typeof triviaCardDifficultySchema>;
export type QuestionCardAnswerMode = z.infer<
	typeof questionCardAnswerModeSchema
>;

const notFoundErrorSchema = z.object({
	message: z.string(),
});

export default router({
	questionsCrud: {
		list: {
			path: "/questions",
			method: "GET",
			response: z.array(questionCardSchema),
		},
		getById: {
			path: "/questions/:id",
			method: "GET",
			pathParams: {
				id: triviaCardIdSchema,
			},
			responses: {
				200: questionCardSchema,
				404: notFoundErrorSchema,
			},
		},
		create: {
			path: "/questions",
			method: "POST",
			body: questionCardInputSchema,
			response: questionCardSchema,
		},
		update: {
			path: "/questions/:id",
			method: "PUT",
			pathParams: {
				id: triviaCardIdSchema,
			},
			body: questionCardInputSchema,
			responses: {
				200: questionCardSchema,
				404: notFoundErrorSchema,
			},
		},
		delete: {
			path: "/questions/:id",
			method: "DELETE",
			pathParams: {
				id: triviaCardIdSchema,
			},
			responses: {
				200: questionCardSchema,
				404: notFoundErrorSchema,
			},
		},
		convertImageToQuestionCardDraft: {
			path: "/questions/convert-image-to-draft",
			method: "POST",
			body: customBody({
				contentType: ["image/jpeg", "image/png"],
				schema: z.instanceof(Uint8Array),
			}),
			response: questionCardInputSchema,
		},
	},
});
