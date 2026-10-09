/**
 * Runs the card agent against the configured model (AGENT_* env vars) and an
 * in-memory deck, in review mode, so nothing is written.
 */
import {
	type QuestionCard,
	type QuestionCardInput,
	questionCardInputSchema,
} from "@packages/contracts";
import { describe, expect, test } from "vitest";
import type { QuestionCardsRepo } from "../questionCards/questionCards.repo.ts";
import { runCardAgent } from "./cardAgent.agent.ts";
import type { CardChange, WriteToolOutput } from "./cardAgent.tools.ts";

const LIVERPOOL = 1;
const MANCHESTER_UNITED = 2;
const PLANETS = 3;
const MOONS = 4;
const TENNIS = 5;
const BASKETBALL = 6;
const ICE_HOCKEY = 7;
const ACTORS_OSCARS = 8;
const ACTORS_DEBUTS = 9;
const DIRECTORS = 10;

const fixtures: Record<number, QuestionCardInput> = {
	[LIVERPOOL]: {
		answerMode: "CHOICES",
		prompt: "Order these Liverpool captains from earliest to latest:",
		difficulty: "MEDIUM",
		tags: ["Sports", "Football", "Liverpool"],
		choices: ["1", "2", "3", "4"],
		choicesAreUnique: true,
		entries: [
			{ text: "Ron Yeats", answer: "1" },
			{ text: "Steven Gerrard", answer: "2" },
			{ text: "Jordan Henderson", answer: "3" },
			{ text: "Virgil van Dijk", answer: "4" },
		],
	},
	[MANCHESTER_UNITED]: {
		answerMode: "CHOICES",
		prompt: "Order these Manchester United captains from earliest to latest:",
		difficulty: "MEDIUM",
		tags: ["Sports", "Football", "Manchester United"],
		choices: ["1", "2", "3", "4"],
		choicesAreUnique: true,
		entries: [
			{ text: "Bryan Robson", answer: "1" },
			{ text: "Roy Keane", answer: "2" },
			{ text: "Gary Neville", answer: "3" },
			{ text: "Bruno Fernandes", answer: "4" },
		],
	},
	[PLANETS]: {
		answerMode: "CHOICES",
		prompt: "Which of these statements about the planets are true?",
		difficulty: "EASY",
		tags: ["Science", "Astronomy", "Solar System"],
		choices: ["True", "False"],
		choicesAreUnique: false,
		entries: [
			{ text: "Jupiter is the largest planet", answer: "True" },
			{ text: "Venus is closest to the Sun", answer: "False" },
			{ text: "Mars has two moons", answer: "True" },
		],
	},
	[MOONS]: {
		answerMode: "CHOICES",
		prompt: "Which planet does each moon orbit?",
		difficulty: "MEDIUM",
		tags: ["Science", "Astronomy", "Solar System"],
		choices: ["Jupiter", "Saturn", "Mars"],
		choicesAreUnique: false,
		entries: [
			{ text: "Europa", answer: "Jupiter" },
			{ text: "Titan", answer: "Saturn" },
			{ text: "Phobos", answer: "Mars" },
			{ text: "Ganymede", answer: "Jupiter" },
		],
	},
	[TENNIS]: {
		answerMode: "TEXT",
		prompt: "Which nation does each tennis player represent?",
		difficulty: "EASY",
		tags: ["Sports", "Tennis", "National Teams"],
		entries: [
			{ text: "Novak Djokovic", answer: "Serbia" },
			{ text: "Rafael Nadal", answer: "Spain" },
			{ text: "Roger Federer", answer: "Switzerland" },
		],
	},
	[BASKETBALL]: {
		answerMode: "TEXT",
		prompt: "Which nation does each basketball player represent?",
		difficulty: "EASY",
		tags: ["Sports", "Basketball", "National Teams"],
		entries: [
			{ text: "Luka Dončić", answer: "Slovenia" },
			{ text: "Nikola Jokić", answer: "Serbia" },
			{ text: "Lauri Markkanen", answer: "Finland" },
		],
	},
	[ICE_HOCKEY]: {
		answerMode: "TEXT",
		prompt: "Which nation does each ice hockey player represent?",
		difficulty: "EASY",
		tags: ["Sports", "Ice Hockey", "National Teams"],
		entries: [
			{ text: "Connor McDavid", answer: "Canada" },
			{ text: "Mikko Rantanen", answer: "Finland" },
			{ text: "Alexander Ovechkin", answer: "Russia" },
		],
	},
	[ACTORS_OSCARS]: {
		answerMode: "TEXT",
		prompt: "Which film won each actor their first Oscar?",
		difficulty: "HARD",
		tags: ["Entertainment", "Film", "Actors"],
		entries: [
			{ text: "Leonardo DiCaprio", answer: "The Revenant" },
			{ text: "Tom Hanks", answer: "Philadelphia" },
		],
	},
	[ACTORS_DEBUTS]: {
		answerMode: "TEXT",
		prompt: "Name each actor's breakthrough film:",
		difficulty: "MEDIUM",
		tags: ["Entertainment", "Film", "Actors"],
		entries: [
			{ text: "Brad Pitt", answer: "Thelma & Louise" },
			{ text: "Margot Robbie", answer: "The Wolf of Wall Street" },
		],
	},
	[DIRECTORS]: {
		answerMode: "TEXT",
		prompt: "Who directed each film?",
		difficulty: "MEDIUM",
		tags: ["Entertainment", "Film", "Directors"],
		entries: [
			{ text: "Jaws", answer: "Steven Spielberg" },
			{ text: "Pulp Fiction", answer: "Quentin Tarantino" },
		],
	},
};

const deck: QuestionCard[] = Object.entries(fixtures).map(([id, card]) => ({
	...questionCardInputSchema.parse(card),
	id: Number(id),
	updatedAt: "2026-01-01T00:00:00.000Z",
}));

const readOnly = () => {
	throw new Error("Review mode should not write");
};

const repo: QuestionCardsRepo = {
	listCards: async () => deck,
	findCard: async (id) => deck.find((card) => card.id === id) ?? null,
	createCard: readOnly,
	updateCard: readOnly,
	deleteCard: readOnly,
};

const runAction = async (instruction: string) => {
	const { result } = runCardAgent({ instruction, autoApply: false, repo });
	await result.consumeStream();
	const steps = await result.steps;

	const changes = new Map<string, CardChange>();
	for (const step of steps) {
		for (const toolResult of step.toolResults) {
			const output = toolResult.output as Partial<WriteToolOutput>;
			for (const change of output.changes ?? []) {
				changes.set(change.changeId, change);
			}
		}
	}

	return {
		toolNames: steps.flatMap((step) =>
			step.toolCalls.map((call) => call.toolName),
		),
		changes: [...changes.values()],
		text: await result.text,
	};
};

type ActionResult = Awaited<ReturnType<typeof runAction>>;

const createdCard = ({ changes }: ActionResult) => {
	expect(changes.map((change) => change.kind)).toEqual(["create"]);
	const [change] = changes;
	if (change.kind !== "create") {
		throw new Error("unreachable");
	}
	return change.card;
};

const updatedCards = ({ changes }: ActionResult) =>
	changes.map((change) => {
		if (change.kind !== "update") {
			throw new Error(`expected only updates, got ${change.kind}`);
		}
		return change.after;
	});

const changedIds = ({ changes }: ActionResult) =>
	changes.map((change) => (change.kind === "create" ? null : change.id)).sort();

const lowerTags = (card: { tags: string[] }) =>
	card.tags.map((tag) => tag.toLowerCase());

const isTrueFalse = (card: QuestionCardInput) =>
	card.answerMode === "CHOICES" &&
	[...card.choices]
		.map((choice) => choice.toLowerCase())
		.sort()
		.join() === "false,true";

/** Ordering cards use each choice (position) exactly once. */
const isOrder = (card: QuestionCardInput) =>
	card.answerMode === "CHOICES" && card.choicesAreUnique;

/** Entries share a few choices, like categories. */
const isPick = (card: QuestionCardInput) =>
	card.answerMode === "CHOICES" && !card.choicesAreUnique && !isTrueFalse(card);

describe("create", () => {
	test("true/false card about planets", async () => {
		const card = createdCard(
			await runAction(
				"Make a true or false card about the planets with 6 statements.",
			),
		);
		expect(isTrueFalse(card)).toBe(true);
		expect(card.entries).toHaveLength(6);
	});

	test("hard order card about inventions", async () => {
		const card = createdCard(
			await runAction(
				"Create a hard card where players order 5 inventions by the year they were invented.",
			),
		);
		expect(isOrder(card)).toBe(true);
		expect(card.entries).toHaveLength(5);
		expect(card.difficulty).toBe("HARD");
	});

	test("order planets by distance", async () => {
		const card = createdCard(
			await runAction("Order the planets by distance from the sun."),
		);
		expect(isOrder(card)).toBe(true);
		expect(card.entries).toHaveLength(8);
	});

	test("pick card with given choices", async () => {
		const card = createdCard(
			await runAction(
				"Make a card where players match 6 famous musicians to their instrument: guitar, piano or drums.",
			),
		);
		expect(isPick(card)).toBe(true);
		expect(card.entries).toHaveLength(6);
		expect(card.answerMode === "CHOICES" && card.choices).toHaveLength(3);
	});

	test("pick card for continents", async () => {
		const card = createdCard(
			await runAction(
				"Create a card where each nation has to be matched to either Europe, Asia, or Africa.",
			),
		);
		expect(isPick(card)).toBe(true);
	});

	test("novels to authors", async () => {
		const card = createdCard(
			await runAction(
				"Create a free answer card matching 6 classic novels to their authors.",
			),
		);
		expect(card.answerMode === "TEXT" || isPick(card)).toBe(true);
		expect(card.entries).toHaveLength(6);
	});

	test("difficulty and tags from the instruction", async () => {
		const card = createdCard(
			await runAction(
				"Create a medium true/false card about the human body, tagged Science and Biology.",
			),
		);
		expect(isTrueFalse(card)).toBe(true);
		expect(card.difficulty).toBe("MEDIUM");
		expect(lowerTags(card)).toEqual(
			expect.arrayContaining(["science", "biology"]),
		);
	});
});

describe("reject", () => {
	test("off-topic request", async () => {
		const result = await runAction("Write me a short poem about the ocean.");
		expect(result.toolNames).toEqual([]);
		expect(result.changes).toEqual([]);
	});

	test("nonsense", async () => {
		const result = await runAction("asdf banana the the");
		expect(result.toolNames).toEqual([]);
		expect(result.changes).toEqual([]);
	});
});

describe("read", () => {
	test("search makes no changes", async () => {
		const result = await runAction("What cards do I have about tennis?");
		expect(result.changes).toEqual([]);
	});
});

describe("update", () => {
	test("difficulty of one card", async () => {
		const result = await runAction("Make the Liverpool captains card hard.");
		expect(changedIds(result)).toEqual([LIVERPOOL]);
		for (const card of updatedCards(result)) {
			expect(card.difficulty).toBe("HARD");
		}
	});

	test("tag on several cards", async () => {
		const result = await runAction(
			"Add the tag Space to all the solar system cards.",
		);
		expect(changedIds(result)).toEqual([PLANETS, MOONS]);
		for (const card of updatedCards(result)) {
			expect(lowerTags(card)).toContain("space");
		}
	});

	test("prompt of one card", async () => {
		const result = await runAction(
			"Change the prompt of the tennis card to 'Which nation does this tennis player represent?'",
		);
		expect(changedIds(result)).toEqual([TENNIS]);
		for (const card of updatedCards(result)) {
			expect(card.prompt).toBe(
				"Which nation does this tennis player represent?",
			);
		}
	});

	test("add an item to a card", async () => {
		const result = await runAction(
			"Add Giannis Antetokounmpo (Greece) to the basketball nations card.",
		);
		expect(changedIds(result)).toEqual([BASKETBALL]);
		for (const card of updatedCards(result)) {
			expect(card.entries).toHaveLength(4);
			expect(card.entries.map((entry) => entry.answer)).toContain("Greece");
		}
	});
});

describe("delete", () => {
	test("all cards with a tag", async () => {
		const result = await runAction("Delete all cards tagged Actors.");
		expect(result.changes.every((change) => change.kind === "delete")).toBe(
			true,
		);
		expect(changedIds(result)).toEqual([ACTORS_OSCARS, ACTORS_DEBUTS]);
	});

	test("one card by description", async () => {
		const result = await runAction(
			"Delete the card about Manchester United captains.",
		);
		expect(result.changes.every((change) => change.kind === "delete")).toBe(
			true,
		);
		expect(changedIds(result)).toEqual([MANCHESTER_UNITED]);
	});

	test("nothing matches", async () => {
		const result = await runAction("Delete the card about cricket.");
		expect(result.changes).toEqual([]);
	});
});
