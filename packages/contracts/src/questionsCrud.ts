import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
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

export const questionImageContentTypes = ["image/jpeg", "image/png"] as const;
export const MAX_QUESTION_IMAGE_BYTES = 10 * 1024 * 1024;

export const questionImageSchema = z
	.file()
	.min(1, "Image must not be empty")
	.max(MAX_QUESTION_IMAGE_BYTES, "Image must be 10 MB or smaller")
	.mime([...questionImageContentTypes]);

const questionCardIdParamsSchema = z.object({
	id: triviaCardIdSchema,
});

const notFoundError = {
	NOT_FOUND: {
		message: "Question not found",
	},
} as const;

const questionsCrud = oc.meta(
	openapi({
		tags: ["Questions"],
		inputStructure: "detailed",
		outputStructure: "detailed",
	}),
);

export const questionsCrudContract = {
	list: questionsCrud
		.meta(
			openapi({
				method: "GET",
				path: "/questions",
				operationId: "listQuestionCards",
				summary: "List question cards",
				description:
					"Returns every question card, most recently updated first.",
				successDescription: "Question cards",
			}),
		)
		.output(
			z.object({
				status: z.literal(200),
				body: z.array(questionCardSchema),
			}),
		),
	getById: questionsCrud
		.meta(
			openapi({
				method: "GET",
				path: "/questions/{id}",
				operationId: "getQuestionCard",
				summary: "Get a question card",
				successDescription: "The question card",
			}),
		)
		.errors(notFoundError)
		.input(z.object({ params: questionCardIdParamsSchema }))
		.output(
			z.object({
				status: z.literal(200),
				body: questionCardSchema,
			}),
		),
	create: questionsCrud
		.meta(
			openapi({
				method: "POST",
				path: "/questions",
				operationId: "createQuestionCard",
				summary: "Create a question card",
				successStatus: 201,
				successDescription: "The created question card",
			}),
		)
		.input(z.object({ body: questionCardInputSchema }))
		.output(
			z.object({
				status: z.literal(201),
				body: questionCardSchema,
			}),
		),
	update: questionsCrud
		.meta(
			openapi({
				method: "PUT",
				path: "/questions/{id}",
				operationId: "updateQuestionCard",
				summary: "Replace a question card",
				successDescription: "The updated question card",
			}),
		)
		.errors(notFoundError)
		.input(
			z.object({
				params: questionCardIdParamsSchema,
				body: questionCardInputSchema,
			}),
		)
		.output(
			z.object({
				status: z.literal(200),
				body: questionCardSchema,
			}),
		),
	delete: questionsCrud
		.meta(
			openapi({
				method: "DELETE",
				path: "/questions/{id}",
				operationId: "deleteQuestionCard",
				summary: "Delete a question card",
				successDescription: "The deleted question card",
			}),
		)
		.errors(notFoundError)
		.input(z.object({ params: questionCardIdParamsSchema }))
		.output(
			z.object({
				status: z.literal(200),
				body: questionCardSchema,
			}),
		),
	convertImageToQuestionCardDraft: questionsCrud
		.meta(
			openapi({
				method: "POST",
				path: "/questions/convert-image-to-draft",
				operationId: "convertImageToQuestionCardDraft",
				summary: "Draft a question card from an image",
				description:
					"Reads a photo of a physical trivia card and returns an unsaved question card draft. The image is sent as the `image` field of a multipart form.",
				successDescription: "Question card draft",
			}),
		)
		.errors({
			UNPROCESSABLE_CONTENT: {
				message: "Could not read a trivia card from this image",
			},
			BAD_GATEWAY: {
				message: "Image recognition service failed",
			},
			GATEWAY_TIMEOUT: {
				message: "Image recognition service timed out",
			},
		})
		.input(
			z.object({
				body: z.object({
					image: questionImageSchema,
				}),
			}),
		)
		.output(
			z.object({
				status: z.literal(200),
				body: questionCardInputSchema,
			}),
		),
};
