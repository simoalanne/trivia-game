import {
	type QuestionCard,
	type QuestionCardInput,
	questionCardAnswerModeSchema,
	questionCardFlatInputSchema,
	questionCardInputSchema,
} from "@packages/contracts";
import { tool } from "ai";
import z from "zod";
import questionCardsRepo, {
	type QuestionCardsRepo,
} from "../questionCards/questionCards.repo.ts";

const SEARCH_PROMPT_MAX_LENGTH = 80;
const SEARCH_LIMIT_DEFAULT = 10;
const SEARCH_LIMIT_MAX = 20;

export type CardChangeStatus = "proposed" | "applied" | "failed";

/**
 * One change made (or proposed) during an action. This is what the UI renders.
 * Changes to the same card share a `changeId`, so a later version of a change
 * replaces the earlier one.
 */
export type CardChange =
	| {
			changeId: string;
			kind: "create";
			status: CardChangeStatus;
			card: QuestionCardInput;
			savedCard?: QuestionCard;
			error?: string;
	  }
	| {
			changeId: string;
			kind: "update";
			status: CardChangeStatus;
			id: number;
			before: QuestionCard;
			after: QuestionCardInput;
			baseUpdatedAt: string;
			savedCard?: QuestionCard;
			error?: string;
	  }
	| {
			changeId: string;
			kind: "delete";
			status: CardChangeStatus;
			id: number;
			before: QuestionCard;
			baseUpdatedAt: string;
			error?: string;
	  };

export type WriteToolOutput = {
	ok: boolean;
	changes: CardChange[];
	errors: string[];
};

/** What the model sees from a write tool: just the outcome. */
const toModelWriteOutput = (output: WriteToolOutput) => ({
	type: "json" as const,
	value: output.ok
		? { ok: true, ids: output.changes.map((change) => change.changeId) }
		: { ok: false, errors: output.errors },
});

const truncate = (text: string, maxLength: number) =>
	text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

const searchText = (card: QuestionCard) =>
	[
		card.prompt,
		...card.tags,
		...card.entries.flatMap((entry) => [entry.text, entry.answer]),
	]
		.join(" ")
		.toLowerCase();

const queryWords = (query: string) =>
	query
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length >= 2);

const cardIdSchema = z.number().int().positive();

/** Validates the flat card fields the model sends against the card schema. */
const parseCard = (fields: z.infer<typeof questionCardFlatInputSchema>) => {
	const result = questionCardInputSchema.safeParse(fields);
	return result.success
		? { ok: true as const, card: result.data }
		: {
				ok: false as const,
				errors: result.error.issues.map((issue) =>
					issue.path.length
						? `${issue.path.join(".")}: ${issue.message}`
						: issue.message,
				),
			};
};

type CreateToolsOptions = {
	autoApply: boolean;
	/** Where cards are read and written. Tests pass an in-memory deck. */
	repo?: QuestionCardsRepo;
};

/**
 * Builds the agent's tools for one action. The returned tools share state that
 * lives only as long as the action: changes made so far, and the card versions
 * the model has read (for the stale-card check).
 */
export const createTools = ({
	autoApply,
	repo = questionCardsRepo,
}: CreateToolsOptions) => {
	const changes = new Map<string, CardChange>();
	const seenVersions = new Map<number, string>();
	let createdCount = 0;

	const remember = (cards: QuestionCard[]) => {
		for (const card of cards) {
			if (!seenVersions.has(card.id)) {
				seenVersions.set(card.id, card.updatedAt);
			}
		}
	};

	/** Cards as they look with this action's proposed changes applied. */
	const loadCards = async () => {
		const cards = await repo.listCards();
		if (autoApply) {
			return cards;
		}

		return cards.flatMap((card): QuestionCard[] => {
			const change = changes.get(`card-${card.id}`);
			if (change?.kind === "delete") {
				return [];
			}
			if (change?.kind === "update") {
				return [{ ...change.after, id: card.id, updatedAt: card.updatedAt }];
			}
			return [card];
		});
	};

	const loadCard = async (id: number) =>
		(await loadCards()).find((card) => card.id === id) ?? null;

	const writeOutput = (
		recorded: CardChange[],
		errors: string[] = [],
	): WriteToolOutput => {
		for (const change of recorded) {
			changes.set(change.changeId, change);
		}

		return {
			ok: errors.length === 0 && recorded.every((c) => c.status !== "failed"),
			changes: recorded,
			errors: [
				...errors,
				...recorded.flatMap((change) =>
					change.error ? [`${change.changeId}: ${change.error}`] : [],
				),
			],
		};
	};

	const staleError = (reason: "NOT_FOUND" | "STALE") =>
		reason === "NOT_FOUND"
			? "card no longer exists"
			: "card changed since it was read, read it again before changing it";

	return {
		searchCards: tool({
			description:
				"Find cards. Returns one short line per card. Use getCard to see a card's items.",
			inputSchema: z.object({
				query: z
					.string()
					.optional()
					.describe("Words to look for in prompts, items and tags"),
				tags: z.array(z.string()).optional(),
				difficulty: z.string().optional().describe("EASY, MEDIUM or HARD"),
				answerMode: questionCardAnswerModeSchema.optional(),
				limit: z.number().int().optional(),
				offset: z.number().int().optional(),
			}),
			execute: async ({
				query,
				tags,
				difficulty,
				answerMode,
				limit,
				offset,
			}) => {
				const words = queryWords(query ?? "");
				const wantedTags = tags?.map((tag) => tag.trim().toLowerCase());
				const wantedDifficulty = difficulty?.trim().toUpperCase();

				const matches = (await loadCards())
					.filter(
						(card) =>
							(!wantedTags?.length ||
								card.tags.some((tag) =>
									wantedTags.includes(tag.toLowerCase()),
								)) &&
							(!wantedDifficulty || card.difficulty === wantedDifficulty) &&
							(!answerMode || card.answerMode === answerMode),
					)
					.map((card) => {
						const text = searchText(card);
						return {
							card,
							score: words.filter((word) => text.includes(word)).length,
						};
					})
					.filter(({ score }) => words.length === 0 || score > 0)
					.sort((a, b) => b.score - a.score);

				const start = Math.max(offset ?? 0, 0);
				const pageSize = Math.min(
					Math.max(limit ?? SEARCH_LIMIT_DEFAULT, 1),
					SEARCH_LIMIT_MAX,
				);
				const page = matches.slice(start, start + pageSize);
				remember(page.map(({ card }) => card));

				return {
					total: matches.length,
					items: page.map(({ card }) => ({
						id: card.id,
						answerMode: card.answerMode,
						difficulty: card.difficulty,
						tags: card.tags,
						prompt: truncate(card.prompt, SEARCH_PROMPT_MAX_LENGTH),
						itemCount: card.entries.length,
					})),
				};
			},
		}),

		getCard: tool({
			description: "Get one card with all its items.",
			inputSchema: z.object({ id: cardIdSchema }),
			execute: async ({ id }) => {
				const card = await loadCard(id);
				if (!card) {
					return { error: `card ${id} not found` };
				}

				remember([card]);
				const { updatedAt: _, ...rest } = card;
				return rest;
			},
		}),

		listTags: tool({
			description: "List all tags with how many cards use each.",
			inputSchema: z.object({}),
			execute: async () => {
				const counts = new Map<string, number>();
				for (const card of await loadCards()) {
					for (const tag of card.tags) {
						counts.set(tag, (counts.get(tag) ?? 0) + 1);
					}
				}

				return [...counts.entries()]
					.sort((a, b) => b[1] - a[1])
					.map(([tag, count]) => ({ tag, count }));
			},
		}),

		createCard: tool({
			description: "Create one new card. Call once per card.",
			inputSchema: questionCardFlatInputSchema,
			execute: async (fields): Promise<WriteToolOutput> => {
				const parsed = parseCard(fields);
				if (!parsed.ok) {
					return writeOutput([], parsed.errors);
				}

				const { card } = parsed;
				createdCount += 1;
				const change: CardChange = {
					changeId: `new-${createdCount}`,
					kind: "create",
					status: "proposed",
					card,
				};

				if (!autoApply) {
					return writeOutput([change]);
				}

				const savedCard = await repo.createCard(card);
				seenVersions.set(savedCard.id, savedCard.updatedAt);
				return writeOutput([{ ...change, status: "applied", savedCard }]);
			},
			toModelOutput: ({ output }) => toModelWriteOutput(output),
		}),

		updateCard: tool({
			description:
				"Replace an existing card. Send its id and the whole card as getCard returns it, with your changes applied.",
			// The card is nested so its fields are JSON, not separate tool
			// parameters. Qwen writes parameters as XML and, after `id`, sometimes
			// writes `<prompt>` instead of `<parameter=prompt>`, which Ollama rejects.
			inputSchema: z.object({
				id: cardIdSchema,
				card: questionCardFlatInputSchema,
			}),
			execute: async ({ id, card: fields }): Promise<WriteToolOutput> => {
				const current = await loadCard(id);
				if (!current) {
					return writeOutput([], [`card ${id} not found`]);
				}

				const parsed = parseCard(fields);
				if (!parsed.ok) {
					return writeOutput([], parsed.errors);
				}

				const { card } = parsed;

				const changeId = `card-${id}`;
				const previous = changes.get(changeId);
				const before = previous?.kind === "update" ? previous.before : current;
				const baseUpdatedAt = seenVersions.get(id) ?? current.updatedAt;
				const change: CardChange = {
					changeId,
					kind: "update",
					status: "proposed",
					id,
					before,
					after: card,
					baseUpdatedAt,
				};

				if (!autoApply) {
					return writeOutput([change]);
				}

				const result = await repo.updateCard(id, card, {
					expectedUpdatedAt: baseUpdatedAt,
				});
				if (!result.ok) {
					return writeOutput([
						{ ...change, status: "failed", error: staleError(result.reason) },
					]);
				}

				seenVersions.set(id, result.card.updatedAt);
				return writeOutput([
					{ ...change, status: "applied", savedCard: result.card },
				]);
			},
			toModelOutput: ({ output }) => toModelWriteOutput(output),
		}),

		deleteCard: tool({
			description: "Delete one or more existing cards.",
			inputSchema: z.object({ ids: z.array(cardIdSchema) }),
			execute: async ({ ids }): Promise<WriteToolOutput> => {
				const recorded: CardChange[] = [];
				const errors: string[] = [];

				for (const id of new Set(ids)) {
					const current = await loadCard(id);
					if (!current) {
						errors.push(`card ${id} not found`);
						continue;
					}

					const changeId = `card-${id}`;
					const previous = changes.get(changeId);
					const before =
						previous?.kind === "update" ? previous.before : current;
					const baseUpdatedAt = seenVersions.get(id) ?? current.updatedAt;
					const change: CardChange = {
						changeId,
						kind: "delete",
						status: "proposed",
						id,
						before,
						baseUpdatedAt,
					};

					if (!autoApply) {
						recorded.push(change);
						continue;
					}

					const result = await repo.deleteCard(id, {
						expectedUpdatedAt: baseUpdatedAt,
					});
					recorded.push(
						result.ok
							? { ...change, status: "applied" }
							: {
									...change,
									status: "failed",
									error: staleError(result.reason),
								},
					);
				}

				return writeOutput(recorded, errors);
			},
			toModelOutput: ({ output }) => toModelWriteOutput(output),
		}),
	};
};

export type CardAgentTools = ReturnType<typeof createTools>;
