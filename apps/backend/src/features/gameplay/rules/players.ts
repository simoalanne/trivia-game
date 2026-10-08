import { ORPCError } from "@orpc/server";
import type { PlayersUpdateMessage } from "@packages/contracts";
import type {
	GamePlayer,
	GameRuleContext,
	GameSession,
} from "../gameplay.types.ts";
import {
	getCurrentRoundOrThrow,
	getNextParticipatingPlayer,
	getPlayerOrThrow,
} from "./queries.ts";
import { endRound } from "./rounds.ts";
import { endTurn, startTurnClock } from "./turns.ts";

const MAX_PLAYERS_IN_GAME = 4;

export const createPlayer = ({
	name,
	isHost = false,
	isParticipatingInCurrentRound = true,
	isReady = false,
	waitingForNextRoundReason = null,
}: {
	name: string;
	isHost?: boolean;
	isParticipatingInCurrentRound?: boolean;
	isReady?: boolean;
	waitingForNextRoundReason?: GamePlayer["waitingForNextRoundReason"];
}): GamePlayer => ({
	id: crypto.randomUUID(),
	name,
	isHost,
	isReady,
	isPlayerTurn: false,
	isParticipatingInCurrentRound,
	waitingForNextRoundReason,
	totalPoints: 0,
	roundPoints: 0,
});

const playersUpdate = (
	player: GamePlayer,
	kind: PlayersUpdateMessage["kind"],
): PlayersUpdateMessage => ({
	type: "playersUpdate",
	kind,
	playerId: player.id,
	playerName: player.name,
});

export const addPlayer = (session: GameSession, name: string) => {
	if (session.gameState === "FINISHED") {
		throw new Error("Cannot join a game that has already finished");
	}
	if (
		session.players.some(
			(player) => player.name.toLowerCase() === name.toLowerCase(),
		)
	) {
		throw new ORPCError("CONFLICT", {
			message: "This player name is already taken in this game",
			data: { reason: "PLAYER_NAME_TAKEN" },
		});
	}
	if (session.players.length >= MAX_PLAYERS_IN_GAME) {
		throw new ORPCError("CONFLICT", {
			message: "This game is full",
			data: { reason: "GAME_FULL" },
		});
	}

	const player = createPlayer({
		name,
		isParticipatingInCurrentRound: session.gameState !== "IN_PROGRESS",
		isReady: session.gameState !== "NOT_STARTED",
		waitingForNextRoundReason:
			session.gameState === "IN_PROGRESS" ? "JOINED_MID_ROUND" : null,
	});
	session.players.push(player);

	return { player, events: [playersUpdate(player, "join")] };
};

export const setPlayerReady = (
	session: GameSession,
	playerId: string,
	isReady: boolean,
) => {
	getPlayerOrThrow(session, playerId).isReady = isReady;
};

/**
 * Removes a player, hands over the host role and moves the turn on when the
 * leaving player was playing. `isEmpty` means the game has no players left.
 */
export const removePlayer = async (
	session: GameSession,
	playerId: string,
	context: GameRuleContext,
) => {
	const playerIndex = session.players.findIndex(
		(player) => player.id === playerId,
	);
	const leavingPlayer =
		playerIndex === -1 ? undefined : session.players.splice(playerIndex, 1)[0];
	if (!leavingPlayer) {
		return { removed: false, isEmpty: false, events: [] };
	}

	if (session.players.length === 0) {
		endTurn(session);
		return { removed: true, isEmpty: true, events: [] };
	}

	const events = [playersUpdate(leavingPlayer, "leave")];

	if (leavingPlayer.isHost) {
		const nextHost = session.players[0];
		if (nextHost) {
			nextHost.isHost = true;
		}
	}

	if (session.gameState !== "IN_PROGRESS" || !leavingPlayer.isPlayerTurn) {
		return { removed: true, isEmpty: false, events };
	}

	const currentRound = getCurrentRoundOrThrow(session);
	endTurn(session);
	session.players.forEach((player) => {
		player.isPlayerTurn = false;
	});

	const nextPlayer = getNextParticipatingPlayer(session, playerIndex);
	if (
		currentRound.answeredEntryIds.size === currentRound.entries.length ||
		!nextPlayer
	) {
		await endRound(session, context);
		return { removed: true, isEmpty: false, events };
	}

	nextPlayer.isPlayerTurn = true;
	startTurnClock(session, context.now());
	return { removed: true, isEmpty: false, events };
};
