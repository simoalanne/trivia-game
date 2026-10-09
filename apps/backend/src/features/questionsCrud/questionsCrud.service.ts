import type {
	InferRouterContractErrorMap,
	ORPCErrorConstructorMap,
} from "@orpc/contract";
import { implement, ORPCError } from "@orpc/server";
import {
	orpcContract,
	type QuestionCard,
	type QuestionCardInput,
	questionCardInputSchema,
} from "@packages/contracts";
import z from "zod";
import prisma from "../../prisma.ts";

const ollamaDraftResponseSchema = {
	type: "object",
	properties: {
		prompt: { type: "string" },
		rings: {
			type: "array",
			items: {
				type: "object",
				properties: {
					inner: {
						anyOf: [{ type: "boolean" }, { type: "string" }],
					},
					outer: { type: "string" },
				},
				required: ["inner", "outer"],
				additionalProperties: false,
			},
		},
	},
	required: ["prompt", "rings"],
	additionalProperties: false,
} as const;

const getRequiredEnv = (name: string) => {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} environment variable is required`);
	}

	return value;
};

const getOllamaConfig = () => ({
	apiBaseUrl:
		process.env.OLLAMA_API_BASE_URL?.trim() ?? "http://localhost:11434/api",
	model: getRequiredEnv("OLLAMA_MODEL"),
	temperature: Number(process.env.OLLAMA_TEMPERATURE ?? "0"),
	timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? "120000"),
	numCtx: Number(process.env.OLLAMA_NUM_CTX ?? "8192"),
});

const questionCardDraftPrompt = `Extract structured content from this image.

Return:
- prompt: the center text
- rings: the surrounding text-answer pairs in positional order around the circle. there is always exactly 10 pairs.

For each rings item:
- outer: the text FARTHER from the center. return the text as is. if there is a true/false icon, return "true" or "false" as a string.
- inner: the paired inner-ring text CLOSER to the center. return the text as is.
- pair outer and inner values using a black connector line that visually links them
- the 10 pairs divide the circle into 10 equal angular slices around the center
- read pairs clockwise
- for each slice, outer and inner come from the same angle relative to the center
- do not pair with a neighboring slice

Output rules:
- preserve original text exactly with exception of soft line-breaks that are not part of the text itself but only exist to allow the text to wrap - in that case, join the split word and omit the hyphen
- keep real hyphens that are part of the intended text, such as compound words, ranges, minus signs, or names
- true/false icons (green checkmarks and red Xs) in the outer-ring become "true" and "false" string values
- return JSON only
`;

type OllamaChatResponse = {
	message?: {
		content?: string;
	};
};

const ollamaResponseToQuestionCardInput = (response: {
	prompt: string;
	rings: { outer: string; inner: string }[];
}) => {
	console.log("Ollama response:", response);
	const normalizedCardContent = {
		prompt: response.prompt,
		entries: response.rings.map((ring) => {
			const answer =
				ring.outer === "true"
					? "True"
					: ring.outer === "false"
						? "False"
						: ring.outer.trim();
			return {
				text: ring.inner,
				answer,
			};
		}),
	};
	console.log("Normalized card content:", normalizedCardContent);
	const uniqueNormalizedAnswers = Array.from(
		new Set(normalizedCardContent.entries.map((entry) => entry.answer)),
	);

	if (
		uniqueNormalizedAnswers.length === 2 &&
		uniqueNormalizedAnswers.every(
			(answer) =>
				answer.toLowerCase() === "true" || answer.toLowerCase() === "false",
		)
	) {
		return {
			answerMode: "CHOICES" as const,
			prompt: normalizedCardContent.prompt,
			difficulty: "MEDIUM" as const,
			tags: [],
			choices: ["True", "False"],
			entries: normalizedCardContent.entries,
			choicesAreUnique: false,
		};
	}

	const oneToTenRegex = /^(?:[1-9]|10)$/;
	if (
		normalizedCardContent.entries.every((entry) =>
			oneToTenRegex.test(entry.answer),
		)
	) {
		return {
			answerMode: "CHOICES" as const,
			prompt: normalizedCardContent.prompt,
			difficulty: "MEDIUM" as const,
			tags: [],
			choices: normalizedCardContent.entries.map((entry) => entry.answer),
			choicesAreUnique: true,
			entries: normalizedCardContent.entries,
		};
	}

	const MAX_CHOICES_PER_CARD_IN_PROMPT = 5;
	if (uniqueNormalizedAnswers.length <= MAX_CHOICES_PER_CARD_IN_PROMPT) {
		return {
			answerMode: "CHOICES" as const,
			prompt: normalizedCardContent.prompt,
			difficulty: "MEDIUM" as const,
			tags: [],
			choices: uniqueNormalizedAnswers,
			entries: normalizedCardContent.entries,
			choicesAreUnique: false,
		};
	}

	return {
		answerMode: "TEXT" as const,
		prompt: normalizedCardContent.prompt,
		difficulty: "MEDIUM" as const,
		tags: [],
		entries: normalizedCardContent.entries,
	};
};

const ollamaCardContentSchema = z.object({
	prompt: z.string(),
	rings: z.array(
		z.object({
			outer: z.string(),
			inner: z.string(),
		}),
	),
});

const parseOllamaCardContent = (content: string) => {
	try {
		return ollamaCardContentSchema.safeParse(
			JSON.parse(
				content
					.replace(/```json/i, "")
					.replace(/```/, "")
					.trim(),
			),
		);
	} catch (error) {
		return { success: false as const, error };
	}
};

type ConvertImageErrors = ORPCErrorConstructorMap<
	InferRouterContractErrorMap<
		typeof orpcContract.questionsCrud.convertImageToQuestionCardDraft
	>
>;

const createQuestionCardDraftFromImage = async (
	image: File,
	errors: ConvertImageErrors,
	signal: AbortSignal | undefined,
): Promise<QuestionCardInput> => {
	const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");

	const { apiBaseUrl, model, temperature, timeoutMs, numCtx } =
		getOllamaConfig();
	const timeoutSignal = AbortSignal.timeout(timeoutMs);

	let response: Response;
	try {
		response = await fetch(`${apiBaseUrl}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				stream: false,
				format: ollamaDraftResponseSchema,
				options: {
					temperature,
					num_ctx: numCtx,
				},
				messages: [
					{
						role: "user",
						content: questionCardDraftPrompt,
						images: [imageBase64],
					},
				],
			}),
			// Abort generation when the client disconnects, not only on timeout.
			signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
		});
	} catch (error) {
		if (signal?.aborted) {
			throw new ORPCError("CLIENT_CLOSED_REQUEST", { cause: error });
		}

		if (timeoutSignal.aborted) {
			throw errors.GATEWAY_TIMEOUT({ cause: error });
		}

		throw errors.BAD_GATEWAY({ cause: error });
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw errors.BAD_GATEWAY({
			cause: new Error(
				`Ollama request failed with ${response.status}: ${errorText || response.statusText}`,
			),
		});
	}

	const payload = (await response.json()) as OllamaChatResponse;
	const content = payload.message?.content?.trim();

	if (!content) {
		throw errors.UNPROCESSABLE_CONTENT({
			cause: new Error("Ollama returned an empty response"),
		});
	}

	const cardContent = parseOllamaCardContent(content);
	if (!cardContent.success) {
		throw errors.UNPROCESSABLE_CONTENT({ cause: cardContent.error });
	}

	const draft = questionCardInputSchema.safeParse(
		ollamaResponseToQuestionCardInput(cardContent.data),
	);
	if (!draft.success) {
		throw errors.UNPROCESSABLE_CONTENT({ cause: draft.error });
	}

	return draft.data;
};

const toQuestionCard = (
	card: Awaited<ReturnType<typeof prisma.triviaCard.findFirstOrThrow>>,
): QuestionCard => {
	const baseCard = {
		id: card.id,
		updatedAt: card.updatedAt.toISOString(),
		difficulty: card.difficulty,
		tags: card.tags,
		prompt: card.data.prompt,
		entries: card.data.entries as QuestionCard["entries"],
	};

	if (card.data.answerMode === "CHOICES") {
		return {
			...baseCard,
			answerMode: "CHOICES",
			choices: card.data.choices,
			choicesAreUnique: card.data.choicesAreUnique,
		};
	}

	return {
		...baseCard,
		answerMode: card.data.answerMode,
	};
};

const getQuestionCardById = async (id: number) => {
	const card = await prisma.triviaCard.findUnique({
		where: { id },
	});

	if (!card) {
		throw new ORPCError("NOT_FOUND", { message: "Question not found" });
	}

	return card;
};

const toCardData = (card: QuestionCardInput) =>
	card.answerMode === "CHOICES"
		? {
				prompt: card.prompt,
				answerMode: card.answerMode,
				choices: card.choices,
				choicesAreUnique: card.choicesAreUnique,
				entries: card.entries,
			}
		: {
				prompt: card.prompt,
				answerMode: card.answerMode,
				entries: card.entries,
			};

const os = implement(orpcContract.questionsCrud);

const questionsCrudService = os.router({
	list: os.list.handler(async () => {
		const cards = await prisma.triviaCard.findMany({
			orderBy: {
				updatedAt: "desc",
			},
		});

		return { status: 200, body: cards.map(toQuestionCard) };
	}),

	getById: os.getById.handler(async ({ input }) => {
		const card = await getQuestionCardById(input.params.id);
		return { status: 200, body: toQuestionCard(card) };
	}),

	create: os.create.handler(async ({ input: { body: card } }) => {
		const createdCard = await prisma.triviaCard.create({
			data: {
				difficulty: card.difficulty,
				tags: card.tags,
				data: toCardData(card),
			},
		});

		return { status: 201, body: toQuestionCard(createdCard) };
	}),

	update: os.update.handler(async ({ input: { params, body: card } }) => {
		await getQuestionCardById(params.id);

		const updatedCard = await prisma.triviaCard.update({
			where: { id: params.id },
			data: {
				difficulty: card.difficulty,
				tags: card.tags,
				data: toCardData(card),
			},
		});

		return { status: 200, body: toQuestionCard(updatedCard) };
	}),

	delete: os.delete.handler(async ({ input }) => {
		await getQuestionCardById(input.params.id);

		const deletedCard = await prisma.triviaCard.delete({
			where: { id: input.params.id },
		});

		return { status: 200, body: toQuestionCard(deletedCard) };
	}),

	convertImageToQuestionCardDraft: os.convertImageToQuestionCardDraft.handler(
		async ({ input, errors, signal }) => {
			const draft = await createQuestionCardDraftFromImage(
				input.body.image,
				errors,
				signal,
			);
			return { status: 200, body: draft };
		},
	),
});

export default questionsCrudService;
