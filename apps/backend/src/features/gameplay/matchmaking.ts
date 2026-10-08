import { ORPCError } from "@orpc/server";
import { createPlayer } from "./rules/players.ts";
import { hasPlayer } from "./rules/queries.ts";
import {
	createGameRoom,
	type GameRoom,
	joinRoom,
	leaveRoom,
} from "./session.ts";

const games = new Map<string, GameRoom>();

const generateGameCode = () =>
	Array.from({ length: 6 }, () => Math.random().toString(36).charAt(2)).join(
		"",
	);

export const findGame = (gameCode: string) => games.get(gameCode.toLowerCase());

const requireGame = (gameCode: string) => {
	const room = findGame(gameCode);
	if (!room) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}
	return room;
};

const requirePlayer = (room: GameRoom, playerId: string) => {
	if (!hasPlayer(room.state, playerId)) {
		throw new ORPCError("NOT_FOUND", { message: "Player not found in game" });
	}
};

export const createGame = ({
	playerName,
	turnDurationSeconds,
}: {
	playerName: string;
	turnDurationSeconds: number;
}) => {
	const gameCode = generateGameCode();
	if (games.has(gameCode)) {
		throw new Error("Game code collision, please try again");
	}

	const host = createPlayer({ name: playerName, isHost: true });
	const room = createGameRoom(
		{
			gameCode,
			players: [host],
			currentRound: null,
			gameState: "NOT_STARTED",
			round: 1,
			playedThroughCardIds: [],
			openedEntryIndex: null,
			turnDurationSeconds,
			turnRemainingMs: null,
			turnExpiresAt: null,
			isTurnPaused: false,
		},
		() => games.delete(gameCode),
	);
	games.set(gameCode, room);

	return { gameCode, playerId: host.id };
};

export const joinGame = ({
	gameCode,
	playerName,
}: {
	gameCode: string;
	playerName: string;
}) => {
	const player = joinRoom(requireGame(gameCode), playerName);
	return { playerId: player.id };
};

export const leaveGame = async ({
	gameCode,
	playerId,
}: {
	gameCode: string;
	playerId: string;
}) => {
	const room = requireGame(gameCode);
	requirePlayer(room, playerId);
	await leaveRoom(room, playerId);
};

export const verifyGame = ({
	gameCode,
	playerId,
}: {
	gameCode: string;
	playerId?: string;
}) => {
	const room = requireGame(gameCode);
	if (playerId) {
		requirePlayer(room, playerId);
	}
	return { gameState: room.state.gameState };
};
