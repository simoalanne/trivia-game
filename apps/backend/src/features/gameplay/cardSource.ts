import prismaClient from "../../prisma.ts";
import type { DrawCard } from "./gameplay.types.ts";

type DbTriviaSourceCard = {
	id: number;
	data: PrismaJson.TriviaCardData;
};

const shuffleArray = <T>(array: T[]) => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

export const drawCard: DrawCard = async (excludedIds) => {
	const [nextCard] = (await prismaClient.$queryRawUnsafe(`
		SELECT "id", "data"
		FROM "TriviaCard"
		${excludedIds.length > 0 ? `WHERE id NOT IN (${excludedIds.join(",")})` : ""}
		ORDER BY RANDOM()
		LIMIT 1
		`)) as DbTriviaSourceCard[];

	if (!nextCard) {
		return null;
	}

	const baseRound = {
		id: nextCard.id,
		prompt: nextCard.data.prompt,
		entries: shuffleArray(
			nextCard.data.entries.map((entry, index) => ({
				id: String(index),
				text: entry.text,
				answer: entry.answer,
			})),
		),
		answeredEntryIds: new Set<string>(),
	};

	switch (nextCard.data.answerMode) {
		case "TEXT":
			return {
				...baseRound,
				answerMode: "TEXT",
			};
		case "CHOICES":
			return {
				...baseRound,
				answerMode: "CHOICES",
				choices: nextCard.data.choices,
				choicesAreUnique: nextCard.data.choicesAreUnique,
			};
	}
};
