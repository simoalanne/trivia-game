import type { QuestionCard, QuestionCardInput } from "@packages/contracts";
import z from "zod";
import { defineService } from "../../initServer.ts";
import prisma from "../../prisma.ts";
import { NotFoundError } from "../../utils/NotFoundError.ts";

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

const createQuestionCardDraftFromImage = async (
	rawBody: unknown,
): Promise<QuestionCardInput> => {
	if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
		throw new Error("Image upload body is missing or invalid");
	}

	const { apiBaseUrl, model, temperature, timeoutMs, numCtx } =
		getOllamaConfig();
	const abortController = new AbortController();
	const timeout = setTimeout(() => abortController.abort(), timeoutMs);

	try {
		const response = await fetch(`${apiBaseUrl}/chat`, {
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
						images: [rawBody.toString("base64")],
					},
				],
			}),
			signal: abortController.signal,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Ollama request failed with ${response.status}: ${errorText || response.statusText}`,
			);
		}

		const payload = (await response.json()) as OllamaChatResponse;
		const content = payload.message?.content?.trim();

		if (!content) {
			throw new Error("Ollama returned an empty response");
		}

		const jsonContent = JSON.parse(
			content
				.replace(/```json/i, "")
				.replace(/```/, "")
				.trim(),
		);
		const validatedResponse = z
			.object({
				prompt: z.string(),
				rings: z.array(
					z.object({
						outer: z.string(),
						inner: z.string(),
					}),
				),
			})
			.parse(jsonContent);
		return ollamaResponseToQuestionCardInput(validatedResponse);
	} finally {
		clearTimeout(timeout);
	}
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
		throw new NotFoundError("Question not found");
	}

	return card;
};

export default defineService("questionsCrud", {
	async list() {
		const cards = await prisma.triviaCard.findMany({
			orderBy: {
				updatedAt: "desc",
			},
		});

		return cards.map(toQuestionCard);
	},

	async getById({ id }) {
		const card = await getQuestionCardById(id);
		return toQuestionCard(card);
	},

	async create(card) {
		const cardData =
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
		const createdCard = await prisma.triviaCard.create({
			data: {
				difficulty: card.difficulty,
				tags: card.tags,
				data: cardData,
			},
		});

		return toQuestionCard(createdCard);
	},

	async update({ id, ...card }) {
		const updatedCard = await prisma.triviaCard.update({
			where: { id },
			data: card,
		});

		return toQuestionCard(updatedCard);
	},

	async delete({ id }) {
		await getQuestionCardById(id);

		const deletedCard = await prisma.triviaCard.delete({
			where: { id },
		});

		return toQuestionCard(deletedCard);
	},

	async convertImageToQuestionCardDraft({ rawBody }) {
		return createQuestionCardDraftFromImage(rawBody);
	},
});
