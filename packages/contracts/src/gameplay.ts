import z from "zod";
import { defineContractTree } from "./initContracts.ts";

export const gamestateSchema = z.object({
	card: z
		.object({
			uiHint: z.enum([
				"MULTIPLE_CHOICE",
				"TRUE_OR_FALSE",
				"OPEN_ENDED",
				"ORDER_ITEMS",
				"COUNTRY",
			]),
			prompt: z.string(),
			entries: z.array(
				z.object({
					text: z.string(),
					answer: z.string().nullable(),
					explanation: z.string().nullable(),
				}),
			),
			choices: z.array(z.string()).nullable(),
		})
		.nullable(),
	players: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			isHost: z.boolean(),
			isReady: z.boolean(),
			isPlayerTurn: z.boolean(),
			isParticipatingInCurrentRound: z.boolean(),
			totalPoints: z.int(),
			roundPoints: z.int(),
		}),
	),
	gameState: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]),
	round: z.int(),
});

const gameplayClientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("toggleReady"),
		state: z.boolean(),
	}),
	z.object({
		type: z.literal("startGame"),
	}),
	z.object({
		type: z.literal("submitAnswer"),
		entryIndex: z.int(),
		answer: z.string(),
	}),
	z.object({
		type: z.literal("doneAnswering"),
	}),
]);

const gameplayServerMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("gameStateUpdate"),
		gameState: gamestateSchema,
	}),
	z.object({
		type: z.literal("gameError"),
		message: z.string(),
	}),
]);

export type GameplayClientMessage = z.infer<typeof gameplayClientMessageSchema>;
export type GameplayServerMessage = z.infer<typeof gameplayServerMessageSchema>;
export type GameplayState = z.infer<typeof gamestateSchema>;
export type GamestateMessage = Extract<
	GameplayServerMessage,
	{ type: "gameStateUpdate" }
>;

export default defineContractTree({
	gameplay: {
		create: {
			path: "/gameplay/create",
			method: "POST",
			request: {
				body: z.object({
					playerName: z.string().trim().min(1).max(20),
				}),
			},
			response: z.object({
				gameCode: z.string(),
				playerId: z.string(),
			}),
		},
		join: {
			path: "/gameplay/join",
			method: "POST",
			request: {
				body: z.object({
					gameCode: z.string().min(1).trim(),
					playerName: z.string().trim().min(1).max(20),
				}),
			},
			response: z.object({
				playerId: z.string(),
			}),
		},
		verifySession: {
			path: "/gameplay/verify-session",
			method: "GET",
			request: {
				query: z.object({
					gameCode: z.string().min(1).trim(),
					playerId: z.string(),
				}),
			},
			response: z.object({
				ok: z.literal(true),
			}),
		},
		play: {
			path: "/gameplay/play",
			method: "GET",
			options: { mode: "websocket" },
			request: {
				query: z.object({
					gameCode: z.string().min(1).trim(),
					playerId: z.string(),
				}),
			},
			messages: {
				client: gameplayClientMessageSchema,
				server: gameplayServerMessageSchema,
			},
		},
	},
});
