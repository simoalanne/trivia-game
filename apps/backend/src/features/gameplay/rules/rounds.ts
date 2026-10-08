import type { GameRuleContext, GameSession } from "../gameplay.types.ts";
import { getCurrentRoundOrThrow } from "./queries.ts";
import { endTurn, startTurnClock } from "./turns.ts";

const initialTurnTimeoutGraceSeconds = 5;

export const startGame = async (
	session: GameSession,
	context: GameRuleContext,
) => {
	if (session.gameState !== "NOT_STARTED") {
		throw new Error("Game has already started");
	}
	if (!session.players.every((player) => player.isReady)) {
		throw new Error("All players must be ready to start the game");
	}

	const nextCard = await context.drawCard([]);
	if (!nextCard) {
		throw new Error("No cards available to start the game");
	}

	session.gameState = "IN_PROGRESS";
	session.currentRound = nextCard;
	session.openedEntryIndex = null;
	session.players.forEach((player, index) => {
		player.isParticipatingInCurrentRound = true;
		player.waitingForNextRoundReason = null;
		player.isPlayerTurn = index === 0;
	});
	startTurnClock(session, context.now(), initialTurnTimeoutGraceSeconds);
};

/** Passes the turn to the next participating player, or ends the round. */
export const advanceGame = async (
	session: GameSession,
	context: GameRuleContext,
) => {
	const { players, currentRound } = session;
	if (!currentRound) {
		throw new Error("Game cannot be advanced if there is no active round");
	}
	const allQuestionsAnswered =
		currentRound.answeredEntryIds.size === currentRound.entries.length;
	const anyPlayersParticipating = players.some(
		(player) => player.isParticipatingInCurrentRound,
	);

	if (allQuestionsAnswered || !anyPlayersParticipating) {
		await endRound(session, context);
		return;
	}

	for (let i = 0; i < players.length; i += 1) {
		const player = players[i];
		if (!player.isPlayerTurn) continue;
		player.isPlayerTurn = false;
		for (let j = 1; j <= players.length; j += 1) {
			const nextPlayer = players[(i + j) % players.length];
			if (nextPlayer.isParticipatingInCurrentRound) {
				nextPlayer.isPlayerTurn = true;
				startTurnClock(session, context.now());
				return;
			}
		}
	}
};

/** Scores the round and deals the next card, or finishes the game. */
export const endRound = async (
	session: GameSession,
	context: GameRuleContext,
) => {
	const currentRound = getCurrentRoundOrThrow(session);

	session.players.forEach((player) => {
		player.totalPoints += player.roundPoints;
		player.roundPoints = 0;
		player.isParticipatingInCurrentRound = true;
		player.waitingForNextRoundReason = null;
		player.isPlayerTurn = false;
	});
	endTurn(session);
	session.playedThroughCardIds.push(currentRound.id);

	const nextCard = await context.drawCard(session.playedThroughCardIds);
	if (!nextCard) {
		session.currentRound = null;
		session.gameState = "FINISHED";
		session.players.forEach((player) => {
			player.isPlayerTurn = false;
			player.isParticipatingInCurrentRound = false;
		});
		return;
	}

	session.round += 1;
	session.currentRound = nextCard;
	session.players.forEach((player, index) => {
		player.isPlayerTurn = index === 0;
	});
	startTurnClock(session, context.now());
};
