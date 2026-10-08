import type { TurnResolvedMessage } from "@packages/contracts";
import type { GameSession } from "../gameplay.types.ts";
import {
	getCurrentRoundOrThrow,
	getCurrentTurnPlayerOrThrow,
	getPlayerOrThrow,
} from "./queries.ts";

/**
 * Starts or resumes the current player's turn clock. The session owns the
 * actual timer and arms it from `turnExpiresAt`.
 */
export const startTurnClock = (
	session: GameSession,
	now: number,
	extraDurationSeconds = 0,
) => {
	stopTurnClock(session);
	session.isTurnPaused = false;

	if (
		session.turnDurationSeconds === 0 ||
		session.gameState !== "IN_PROGRESS"
	) {
		return;
	}
	if (!session.players.some((player) => player.isPlayerTurn)) {
		return;
	}

	const timeoutMs =
		session.turnRemainingMs ??
		(session.turnDurationSeconds + extraDurationSeconds) * 1000;
	session.turnRemainingMs = timeoutMs;
	session.turnExpiresAt = new Date(now + timeoutMs).toISOString();
};

const stopTurnClock = (session: GameSession) => {
	session.turnExpiresAt = null;
};

/** Clears everything tied to the current turn. */
export const endTurn = (session: GameSession) => {
	stopTurnClock(session);
	session.turnRemainingMs = null;
	session.isTurnPaused = false;
	session.openedEntryIndex = null;
};

const getTurnRemainingMs = (session: GameSession, now: number) => {
	if (session.turnExpiresAt) {
		return Math.max(0, new Date(session.turnExpiresAt).getTime() - now);
	}

	return session.turnRemainingMs ?? 0;
};

export const setTurnPaused = (
	session: GameSession,
	playerId: string,
	paused: boolean,
	now: number,
) => {
	const player = getPlayerOrThrow(session, playerId);
	if (!player.isHost) {
		throw new Error("Only the host can pause the turn");
	}
	if (
		session.turnDurationSeconds === 0 ||
		session.gameState !== "IN_PROGRESS"
	) {
		return;
	}
	if (session.isTurnPaused === paused) {
		return;
	}

	if (paused) {
		session.turnRemainingMs = getTurnRemainingMs(session, now);
		stopTurnClock(session);
		session.isTurnPaused = true;
		return;
	}

	startTurnClock(session, now);
};

const isAnswerCorrect = (
	expectedAnswer: PrismaJson.TriviaEntry["answer"],
	submittedAnswer: string,
) =>
	expectedAnswer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

export const submitAnswer = (
	session: GameSession,
	playerId: string,
	entryIndex: number,
	answer: string,
): TurnResolvedMessage => {
	const currentRound = getCurrentRoundOrThrow(session);
	const currentPlayer = getCurrentTurnPlayerOrThrow(session, playerId);

	const entry = currentRound.entries[entryIndex];
	if (!entry || currentRound.answeredEntryIds.has(entry.id)) {
		throw new Error("Invalid entry index");
	}

	const isCorrect = isAnswerCorrect(entry.answer, answer);
	currentRound.answeredEntryIds.add(entry.id);
	currentPlayer.roundPoints = isCorrect ? currentPlayer.roundPoints + 1 : 0;
	endTurn(session);

	return {
		type: "turnResolved",
		resolution: "submitted",
		answer,
		correctAnswer: entry.answer,
		entryIndex,
		entryText: entry.text,
		isCorrect,
		playerId,
		playerName: currentPlayer.name,
		prompt: currentRound.prompt,
		answerMode: currentRound.answerMode,
	};
};

export const doneAnswering = (session: GameSession, playerId: string) => {
	const currentPlayer = getCurrentTurnPlayerOrThrow(session, playerId);
	endTurn(session);
	currentPlayer.isParticipatingInCurrentRound = false;
	currentPlayer.waitingForNextRoundReason = "DONE_ANSWERING";
};

/**
 * Ends the turn of a player whose time ran out. Returns null when the turn
 * already moved on, so a stale timer does nothing.
 */
export const timeOutTurn = (
	session: GameSession,
	playerId: string,
): TurnResolvedMessage | null => {
	const currentPlayer = session.players.find((player) => player.isPlayerTurn);
	if (!currentPlayer || currentPlayer.id !== playerId) {
		return null;
	}

	endTurn(session);
	currentPlayer.isParticipatingInCurrentRound = false;
	currentPlayer.waitingForNextRoundReason = null;

	return {
		type: "turnResolved",
		resolution: "timedOut",
		playerId: currentPlayer.id,
		playerName: currentPlayer.name,
	};
};

export const setOpenedEntry = (
	session: GameSession,
	playerId: string,
	entryIndex: number | null,
) => {
	if (entryIndex === null) {
		session.openedEntryIndex = null;
		return;
	}

	const currentRound = getCurrentRoundOrThrow(session);
	getCurrentTurnPlayerOrThrow(session, playerId);

	const entry = currentRound.entries[entryIndex];
	if (!entry || currentRound.answeredEntryIds.has(entry.id)) {
		throw new Error("Invalid entry index");
	}

	session.openedEntryIndex = entryIndex;
};
