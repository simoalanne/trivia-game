import type { QuestionCard, QuestionCardInput } from "@packages/contracts";
import { defineService } from "../../initServer.ts";
import prisma from "../../prisma.ts";
import { NotFoundError } from "../../utils/NotFoundError.ts";

const toQuestionCard = (
	card: Awaited<ReturnType<typeof prisma.triviaCard.findFirstOrThrow>>,
): QuestionCard => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				id: card.id,
				format: card.format,
				difficulty: card.difficulty,
				tags: card.tags,
				prompt: card.data.prompt,
				entries: card.data.entries as Extract<
					QuestionCard,
					{ format: "TRUE_OR_FALSE" }
				>["entries"],
			};
		case "OPEN_ENDED":
			return {
				id: card.id,
				format: card.format,
				difficulty: card.difficulty,
				tags: card.tags,
				prompt: card.data.prompt,
				entries: card.data.entries as Extract<
					QuestionCard,
					{ format: "OPEN_ENDED" }
				>["entries"],
			};
		case "ORDER_ITEMS":
			return {
				id: card.id,
				format: card.format,
				difficulty: card.difficulty,
				tags: card.tags,
				prompt: card.data.prompt,
				entries: card.data.entries as Extract<
					QuestionCard,
					{ format: "ORDER_ITEMS" }
				>["entries"],
			};
		case "MULTIPLE_CHOICE":
		default:
			return {
				id: card.id,
				format: "MULTIPLE_CHOICE",
				difficulty: card.difficulty,
				tags: card.tags,
				prompt: card.data.prompt,
				choices: card.data.choices ?? [],
				entries: card.data.entries as Extract<
					QuestionCard,
					{ format: "MULTIPLE_CHOICE" }
				>["entries"],
			};
	}
};

const toTriviaCardCreateData = (card: QuestionCardInput) => ({
	format: card.format,
	difficulty: card.difficulty,
	tags: card.tags,
	data: {
		prompt: card.prompt,
		entries: card.entries,
		...(card.format === "MULTIPLE_CHOICE" ? { choices: card.choices } : {}),
	},
});

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
		const createdCard = await prisma.triviaCard.create({
			data: toTriviaCardCreateData(card),
		});

		return toQuestionCard(createdCard);
	},

	async update({ id, ...card }) {
		await getQuestionCardById(id);

		const updatedCard = await prisma.triviaCard.update({
			where: { id },
			data: toTriviaCardCreateData(card),
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
});
