import { contracts } from "@packages/contracts";
import { RouteResponseError, router } from "@rest-rpc/hono";
import { JoinRejectedError } from "./gameplay.types.ts";
import {
	createGame,
	findGame,
	joinGame,
	leaveGame,
	verifyGame,
} from "./matchmaking.ts";
import { hasPlayer } from "./rules/queries.ts";
import {
	connectPlayer,
	disconnectPlayer,
	handleClientMessage,
	type PlayerConnection,
} from "./session.ts";

const gameplayService = router(contracts.gameplay, {
	async create(input) {
		return createGame(input);
	},

	async join(input) {
		try {
			return joinGame(input);
		} catch (error) {
			if (error instanceof JoinRejectedError) {
				throw new RouteResponseError(contracts.gameplay.join, {
					status: 409,
					body: { code: error.code },
				});
			}
			throw error;
		}
	},

	async leave(input) {
		await leaveGame(input);
		return { ok: true as const };
	},

	async verifyGame(input) {
		return verifyGame(input);
	},

	async play({ gameCode, playerId, context }) {
		const { socket } = context;
		const room = findGame(gameCode);
		if (!room) {
			return socket.close(1008, "Game not found");
		}
		if (!hasPlayer(room.state, playerId)) {
			return socket.close(1008, "Player not in game");
		}

		const connection: PlayerConnection = {
			send: (message) => socket.send(message),
			close: (code, reason) => socket.close(code, reason),
		};
		connectPlayer(room, playerId, connection);
		socket.onMessage((message) =>
			handleClientMessage(room, playerId, connection, message),
		);
		socket.onClose(() => disconnectPlayer(room, playerId, connection));
	},
});

export default gameplayService;
