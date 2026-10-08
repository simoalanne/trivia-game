import type { GameplayState } from "@packages/contracts";
import type { ActiveRound, GameSession } from "../gameplay.types.ts";

const getAvailableChoices = (
	card: Extract<ActiveRound, { answerMode: "CHOICES" }>,
) => {
	if (card.choicesAreUnique) {
		const consumedChoices = new Set(
			card.entries
				.filter((entry) => card.answeredEntryIds.has(entry.id))
				.map((entry) => entry.answer),
		);

		return card.choices.filter((choice) => !consumedChoices.has(choice));
	}

	return card.choices;
};

/** The game state as players see it: unanswered entries hide their answers. */
export const buildClientGameState = (session: GameSession): GameplayState => {
	const activeRound = session.currentRound;
	const entries = activeRound?.entries.map((entry) => ({
		text: entry.text,
		answer: activeRound.answeredEntryIds.has(entry.id) ? entry.answer : null,
	}));
	const card = !activeRound
		? null
		: activeRound.answerMode === "CHOICES"
			? {
					answerMode: "CHOICES" as const,
					prompt: activeRound.prompt,
					entries: entries ?? [],
					choices: getAvailableChoices(activeRound),
				}
			: {
					answerMode: activeRound.answerMode,
					prompt: activeRound.prompt,
					entries: entries ?? [],
				};

	return {
		card,
		players: session.players.map((player) => ({ ...player })),
		gameState: session.gameState,
		round: session.round,
		isTurnPaused: session.isTurnPaused,
		turnDurationSeconds: session.turnDurationSeconds,
		turnRemainingMs: session.turnRemainingMs,
		turnExpiresAt: session.turnExpiresAt,
	};
};
