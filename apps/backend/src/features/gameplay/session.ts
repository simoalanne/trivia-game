import type {
	GameplayClientMessage,
	GameplayServerMessage,
} from "@packages/contracts";
import { drawCard } from "./cardSource.ts";
import type {
	GameEvent,
	GameRuleContext,
	GameSession,
} from "./gameplay.types.ts";
import { addPlayer, removePlayer, setPlayerReady } from "./rules/players.ts";
import { hasPlayer } from "./rules/queries.ts";
import { advanceGame, startGame } from "./rules/rounds.ts";
import {
	doneAnswering,
	setOpenedEntry,
	setTurnPaused,
	submitAnswer,
	timeOutTurn,
} from "./rules/turns.ts";
import { buildClientGameState } from "./rules/view.ts";

/** A connected player, independent of the transport carrying the messages. */
export type PlayerConnection = {
	send(message: GameplayServerMessage): void;
	close(code: number, reason: string): void;
};

/** A running game: its state plus everything the rules don't own. */
export type GameRoom = {
	state: GameSession;
	connections: Map<string, PlayerConnection>;
	turnTimer: {
		handle: ReturnType<typeof setTimeout>;
		expiresAt: string;
		playerId: string;
	} | null;
	onEmpty: () => void;
};

const ruleContext: GameRuleContext = {
	drawCard,
	now: () => Date.now(),
};

export const createGameRoom = (
	state: GameSession,
	onEmpty: () => void,
): GameRoom => ({
	state,
	connections: new Map(),
	turnTimer: null,
	onEmpty,
});

const broadcast = (room: GameRoom, message: GameplayServerMessage) => {
	for (const player of room.state.players) {
		room.connections.get(player.id)?.send(message);
	}
};

const broadcastEvents = (room: GameRoom, events: GameEvent[]) => {
	for (const event of events) {
		broadcast(room, event);
	}
};

const broadcastState = (room: GameRoom) => {
	broadcast(room, {
		type: "gameStateUpdate",
		gameState: buildClientGameState(room.state),
	});
	broadcast(room, {
		type: "openedEntryUpdate",
		entryIndex: room.state.openedEntryIndex,
	});
};

/** Arms, re-arms or clears the turn timer to match the rules' turn clock. */
const syncTurnTimer = (room: GameRoom) => {
	const { turnExpiresAt } = room.state;
	const turnPlayerId = room.state.players.find(
		(player) => player.isPlayerTurn,
	)?.id;

	if (
		room.turnTimer?.expiresAt === turnExpiresAt &&
		room.turnTimer?.playerId === turnPlayerId
	) {
		return;
	}
	if (room.turnTimer) {
		clearTimeout(room.turnTimer.handle);
		room.turnTimer = null;
	}
	if (!turnExpiresAt || !turnPlayerId) {
		return;
	}

	const delayMs = Math.max(0, new Date(turnExpiresAt).getTime() - Date.now());
	room.turnTimer = {
		handle: setTimeout(() => {
			room.turnTimer = null;
			handleTurnTimedOut(room, turnPlayerId).catch((error) => {
				console.error("Turn timeout handling failed", error);
			});
		}, delayMs),
		expiresAt: turnExpiresAt,
		playerId: turnPlayerId,
	};
};

const runAction = async (room: GameRoom, action: () => Promise<void>) => {
	try {
		await action();
	} finally {
		syncTurnTimer(room);
	}
};

const handleTurnTimedOut = (room: GameRoom, playerId: string) =>
	runAction(room, async () => {
		const turnResolved = timeOutTurn(room.state, playerId);
		if (!turnResolved) {
			return;
		}

		broadcast(room, turnResolved);
		await advanceGame(room.state, ruleContext);
		broadcastState(room);
	});

const removeFromRoom = async (room: GameRoom, playerId: string) => {
	const { removed, isEmpty, events } = await removePlayer(
		room.state,
		playerId,
		ruleContext,
	);
	if (removed) {
		room.connections.delete(playerId);
	}
	if (isEmpty) {
		room.onEmpty();
		return;
	}

	broadcastEvents(room, events);
	broadcastState(room);
};

export const joinRoom = (room: GameRoom, playerName: string) => {
	const { player, events } = addPlayer(room.state, playerName);
	broadcastEvents(room, events);
	broadcastState(room);
	return player;
};

export const leaveRoom = (room: GameRoom, playerId: string) =>
	runAction(room, () => removeFromRoom(room, playerId));

export const connectPlayer = (
	room: GameRoom,
	playerId: string,
	connection: PlayerConnection,
) => {
	if (!hasPlayer(room.state, playerId)) {
		throw new Error("Player not found");
	}

	room.connections.set(playerId, connection);
	broadcastState(room);
};

export const disconnectPlayer = (
	room: GameRoom,
	playerId: string,
	connection: PlayerConnection,
) => {
	if (room.connections.get(playerId) !== connection) {
		return;
	}

	room.connections.delete(playerId);
	const player = room.state.players.find(
		(currentPlayer) => currentPlayer.id === playerId,
	);
	if (player?.isPlayerTurn) {
		room.state.openedEntryIndex = null;
	}
	broadcast(room, {
		type: "openedEntryUpdate",
		entryIndex: room.state.openedEntryIndex,
	});
	console.log("Player disconnected", playerId);
};

const applyClientMessage = (
	room: GameRoom,
	playerId: string,
	connection: PlayerConnection,
	message: GameplayClientMessage,
) =>
	runAction(room, async () => {
		console.log("Received message from player", playerId, ":", message);
		const { state } = room;

		switch (message.type) {
			case "toggleReady":
				setPlayerReady(state, playerId, message.state);
				break;
			case "startGame":
				await startGame(state, playerId, ruleContext);
				break;
			case "submitAnswer":
				broadcast(
					room,
					submitAnswer(state, playerId, message.entryIndex, message.answer),
				);
				await advanceGame(state, ruleContext);
				break;
			case "doneAnswering":
				doneAnswering(state, playerId);
				await advanceGame(state, ruleContext);
				break;
			case "leaveGame":
				await removeFromRoom(room, playerId);
				connection.close(1000, "Player left game");
				return;
			case "setOpenedEntry":
				setOpenedEntry(state, playerId, message.entryIndex);
				broadcast(room, {
					type: "openedEntryUpdate",
					entryIndex: message.entryIndex,
				});
				return;
			case "setTurnPaused":
				setTurnPaused(state, playerId, message.paused, ruleContext.now());
				break;
		}

		broadcastState(room);
	});

/**
 * Applies a player's message. A failed action is reported back to that
 * player as an unexpectedError (to help debugging) and keeps them connected.
 */
export const handleClientMessage = async (
	room: GameRoom,
	playerId: string,
	connection: PlayerConnection,
	message: GameplayClientMessage,
) => {
	try {
		await applyClientMessage(room, playerId, connection, message);
	} catch (error) {
		console.error(`Gameplay action "${message.type}" failed`, error);
		connection.send({
			type: "unexpectedError",
			message: error instanceof Error ? error.message : String(error),
		});
	}
};
