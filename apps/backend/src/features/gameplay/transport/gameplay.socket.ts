import {
	type GameplayClientMessage,
	gameplayClientMessageSchema,
	gameplaySocketPath,
	gameplaySocketQuerySchema,
} from "@packages/contracts";
import type { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { createMiddleware } from "hono/factory";
import z from "zod";
import { findGame } from "../matchmaking.ts";
import { hasPlayer } from "../rules/queries.ts";
import {
	connectPlayer,
	disconnectPlayer,
	type GameRoom,
	handleClientMessage,
	type PlayerConnection,
} from "../session.ts";

const parseClientMessage = (
	data: unknown,
): { message: GameplayClientMessage } | { error: string } => {
	if (typeof data !== "string") {
		return { error: "Invalid message: expected a JSON text message" };
	}

	let json: unknown;
	try {
		json = JSON.parse(data);
	} catch {
		return { error: "Invalid message: not valid JSON" };
	}

	const result = gameplayClientMessageSchema.safeParse(json);
	return result.success
		? { message: result.data }
		: { error: `Invalid message: ${z.prettifyError(result.error)}` };
};

/** Rejects a malformed connection URL before upgrading. */
const validateSocketQuery = createMiddleware(async (c, next) => {
	const query = gameplaySocketQuerySchema.safeParse(c.req.query());
	if (!query.success) {
		return c.json({ message: z.prettifyError(query.error) }, 400);
	}
	await next();
});

const gameplaySocket = upgradeWebSocket((c) => {
	const { gameCode, playerId } = gameplaySocketQuerySchema.parse(c.req.query());
	let room: GameRoom | undefined;
	let connection: PlayerConnection | undefined;

	return {
		onOpen(_event, ws) {
			// Unknown games and players are closed with a reason, since browsers
			// cannot read the status of a rejected upgrade.
			room = findGame(gameCode);
			if (!room) {
				ws.close(1008, "Game not found");
				return;
			}
			if (!hasPlayer(room.state, playerId)) {
				ws.close(1008, "Player not in game");
				return;
			}

			connection = {
				send: (message) => ws.send(JSON.stringify(message)),
				close: (code, reason) => ws.close(code, reason),
			};
			connectPlayer(room, playerId, connection);
		},

		async onMessage(event) {
			if (!room || !connection) {
				return;
			}

			const parsed = parseClientMessage(event.data);
			if ("error" in parsed) {
				connection.send({ type: "unexpectedError", message: parsed.error });
				return;
			}

			await handleClientMessage(room, playerId, connection, parsed.message);
		},

		onClose() {
			if (room && connection) {
				disconnectPlayer(room, playerId, connection);
			}
		},
	};
});

export const registerGameplaySocket = (app: Hono) => {
	app.get(gameplaySocketPath, validateSocketQuery, gameplaySocket);
};
