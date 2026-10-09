import type { QuestionCard, QuestionCardInput } from "@packages/contracts";
import prisma from "../../prisma.ts";

type TriviaCardRow = Awaited<
	ReturnType<typeof prisma.triviaCard.findFirstOrThrow>
>;

export const toQuestionCard = (card: TriviaCardRow): QuestionCard => {
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

const toRowData = (card: QuestionCardInput) => ({
	difficulty: card.difficulty,
	tags: card.tags,
	data: toCardData(card),
});

/**
 * Optional optimistic-concurrency check: when `expectedUpdatedAt` is given,
 * the write only happens if the card has not changed since then.
 */
type WriteOptions = {
	expectedUpdatedAt?: string;
};

export type WriteResult =
	| { ok: true; card: QuestionCard }
	| { ok: false; reason: "NOT_FOUND" | "STALE" };

const checkWritable = async (
	id: number,
	{ expectedUpdatedAt }: WriteOptions,
): Promise<Extract<WriteResult, { ok: false }> | null> => {
	const current = await prisma.triviaCard.findUnique({
		where: { id },
		select: { updatedAt: true },
	});

	if (!current) {
		return { ok: false, reason: "NOT_FOUND" };
	}

	if (
		expectedUpdatedAt !== undefined &&
		current.updatedAt.toISOString() !== expectedUpdatedAt
	) {
		return { ok: false, reason: "STALE" };
	}

	return null;
};

const listCards = async () => {
	const cards = await prisma.triviaCard.findMany({
		orderBy: { updatedAt: "desc" },
	});

	return cards.map(toQuestionCard);
};

const findCard = async (id: number) => {
	const card = await prisma.triviaCard.findUnique({ where: { id } });
	return card ? toQuestionCard(card) : null;
};

const createCard = async (card: QuestionCardInput) =>
	toQuestionCard(await prisma.triviaCard.create({ data: toRowData(card) }));

const updateCard = async (
	id: number,
	card: QuestionCardInput,
	options: WriteOptions = {},
): Promise<WriteResult> => {
	const failure = await checkWritable(id, options);
	if (failure) {
		return failure;
	}

	const updatedCard = await prisma.triviaCard.update({
		where: { id },
		data: toRowData(card),
	});

	return { ok: true, card: toQuestionCard(updatedCard) };
};

const deleteCard = async (
	id: number,
	options: WriteOptions = {},
): Promise<WriteResult> => {
	const failure = await checkWritable(id, options);
	if (failure) {
		return failure;
	}

	const deletedCard = await prisma.triviaCard.delete({ where: { id } });
	return { ok: true, card: toQuestionCard(deletedCard) };
};

const questionCardsRepo = {
	listCards,
	findCard,
	createCard,
	updateCard,
	deleteCard,
};

export type QuestionCardsRepo = typeof questionCardsRepo;

export default questionCardsRepo;
