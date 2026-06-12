import z from "zod";
import { defineContractTree } from "./initContracts.ts";

const playerNameSchema = z.string().trim().min(1).max(20);

const triviaCardFormatSchema = z.enum([
	"MULTIPLE_CHOICE",
	"TRUE_OR_FALSE",
	"OPEN_ENDED",
	"ORDER_ITEMS",
]);

const gameStateStatusSchema = z.enum(["waiting", "in_progress", "finished"]);
const entryStateSchema = z.enum(["unanswered", "correct", "incorrect"]);

const triviaAnswerSchema = z.union([
	z.string(),
	z.array(z.string()),
	z.boolean(),
	z.number(),
]);

const submittedAnswerSchema = z.union([z.string(), z.boolean(), z.number()]);

export const playerSchema = z.object({
	id: z.string(),
	name: z.string(),
	isHost: z.boolean(),
	isReady: z.boolean(),
});

export const currentCardSchema = z.object({
	id: z.number().int(),
	prompt: z.string(),
	format: triviaCardFormatSchema,
	choices: z.array(z.string()).optional(),
	entries: z.array(
		z.object({
			text: z.string(),
			answer: triviaAnswerSchema,
			explanation: z.string().optional(),
			state: entryStateSchema,
		}),
	),
});

export const gameSessionSchema = z.object({
	players: z.array(playerSchema),
	currentCard: currentCardSchema.nullable(),
	gameState: gameStateStatusSchema,
	round: z.number().int().positive(),
	scores: z.record(z.string(), z.number().int().nonnegative()),
	playerTurnIndex: z.number().int().nonnegative(),
	playedThroughCardIds: z.array(z.number().int()),
});

export const gameplayClientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("toggleReady"),
		state: z.boolean(),
	}),
	z.object({
		type: z.literal("startGame"),
	}),
	z.object({
		type: z.literal("submitAnswer"),
		entryIndex: z.number().int().nonnegative(),
		answer: submittedAnswerSchema,
	}),
	z.object({
		type: z.literal("nextTurn"),
	}),
	z.object({
		type: z.literal("endRound"),
	}),
]);

export const gameplayServerMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("gameStateUpdate"),
		gameState: gameSessionSchema,
	}),
	z.object({
		type: z.literal("gameError"),
		message: z.string(),
	}),
]);

export type GameplayClientMessage = z.infer<typeof gameplayClientMessageSchema>;
export type GameplayServerMessage = z.infer<typeof gameplayServerMessageSchema>;
export type GameplaySession = z.infer<typeof gameSessionSchema>;
export type GameplayPlayer = z.infer<typeof playerSchema>;
export type GameplayCurrentCard = z.infer<typeof currentCardSchema>;

export default defineContractTree({
	gameplay: {
		create: {
			path: "/gameplay/create",
			method: "POST",
			request: {
				body: z.object({
					playerName: playerNameSchema,
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
					playerName: playerNameSchema,
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
