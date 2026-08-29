import { router } from "@rest-rpc/core";
import z from "zod";
import { questionCardAnswerModeSchema } from "./questionsCrud.ts";

export const gameplayTurnTimeoutSecondsMin = 0;
export const gameplayTurnTimeoutSecondsMax = 60;
export const gameplayTurnTimeoutSecondsDefault = 30;

const gameplayCardEntrySchema = z.object({
	text: z.string(),
	answer: z.string().nullable(),
});

const gameplayBaseCardSchema = z.object({
	prompt: z.string(),
	entries: z.array(gameplayCardEntrySchema),
});

const gameplayPlayerWaitingReasonSchema = z
	.enum(["JOINED_MID_ROUND", "DONE_ANSWERING"])
	.nullable();

const gameplayCardSchema = z.discriminatedUnion("answerMode", [
	gameplayBaseCardSchema.extend({
		answerMode: z.literal("TEXT"),
	}),
	gameplayBaseCardSchema.extend({
		answerMode: z.literal("COUNTRY"),
	}),
	gameplayBaseCardSchema.extend({
		answerMode: z.literal("CHOICES"),
		choices: z.array(z.string()),
	}),
]);

export const gamestateSchema = z.object({
	card: gameplayCardSchema.nullable(),
	players: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			isHost: z.boolean(),
			isReady: z.boolean(),
			isPlayerTurn: z.boolean(),
			isParticipatingInCurrentRound: z.boolean(),
			waitingForNextRoundReason: gameplayPlayerWaitingReasonSchema,
			totalPoints: z.int(),
			roundPoints: z.int(),
		}),
	),
	gameState: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]),
	round: z.int(),
	turnDurationSeconds: z
		.int()
		.min(gameplayTurnTimeoutSecondsMin)
		.max(gameplayTurnTimeoutSecondsMax),
	turnRemainingMs: z.int().nullable(),
	turnExpiresAt: z.string().datetime().nullable(),
	isTurnPaused: z.boolean(),
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
	z.object({
		type: z.literal("leaveGame"),
	}),
	z.object({
		type: z.literal("setOpenedEntry"),
		entryIndex: z.int().nullable(),
	}),
	z.object({
		type: z.literal("setTurnPaused"),
		paused: z.boolean(),
	}),
]);

const turnResolvedMessageSchema = z.discriminatedUnion("resolution", [
	z.object({
		type: z.literal("turnResolved"),
		resolution: z.literal("submitted"),
		playerId: z.string(),
		playerName: z.string(),
		answerMode: questionCardAnswerModeSchema,
		entryIndex: z.int(),
		entryText: z.string(),
		prompt: z.string(),
		answer: z.string(),
		correctAnswer: z.string(),
		isCorrect: z.boolean(),
	}),
	z.object({
		type: z.literal("turnResolved"),
		resolution: z.literal("timedOut"),
		playerId: z.string(),
		playerName: z.string(),
	}),
]);

const playersUpdateMessageSchema = z.object({
	type: z.literal("playersUpdate"),
	kind: z.enum(["join", "leave"]),
	playerId: z.string(),
	playerName: z.string(),
});

const gameplayServerMessageSchema = z.union([
	z.object({
		type: z.literal("gameStateUpdate"),
		gameState: gamestateSchema,
	}),
	turnResolvedMessageSchema,
	playersUpdateMessageSchema,
	z.object({
		type: z.literal("openedEntryUpdate"),
		entryIndex: z.int().nullable(),
	}),
	z.object({
		type: z.literal("gameError"),
		message: z.string(),
	}),
]);

const gameplayNotFoundErrorSchema = z.object({
	message: z.string(),
});

const gameplayJoinErrorSchema = z.discriminatedUnion("code", [
	z.object({
		code: z
			.literal("PLAYER_NAME_TAKEN")
			.describe(
				"The player name is already taken in this game. Names are case-insensitive and must be unique.",
			),
	}),
	z.object({
		code: z
			.literal("GAME_FULL")
			.describe("The game is full and cannot accept new players."),
	}),
]);

export type GameplayClientMessage = z.infer<typeof gameplayClientMessageSchema>;
export type GameplayServerMessage = z.infer<typeof gameplayServerMessageSchema>;
export type GameplayState = z.infer<typeof gamestateSchema>;
export type GamestateMessage = Extract<
	GameplayServerMessage,
	{ type: "gameStateUpdate" }
>;
export type TurnResolvedMessage = Extract<
	GameplayServerMessage,
	{ type: "turnResolved" }
>;
export type PlayersUpdateMessage = Extract<
	GameplayServerMessage,
	{ type: "playersUpdate" }
>;

export default router({
	gameplay: {
		create: {
			path: "/gameplay/create",
			method: "POST",
			body: z.object({
				playerName: z.string().trim().min(1).max(20),
				turnDurationSeconds: z
					.int()
					.min(gameplayTurnTimeoutSecondsMin)
					.max(gameplayTurnTimeoutSecondsMax)
					.default(gameplayTurnTimeoutSecondsDefault),
			}),
			response: z.object({
				gameCode: z.string(),
				playerId: z.string(),
			}),
		},
		join: {
			path: "/gameplay/join",
			method: "POST",
			body: z.object({
				gameCode: z.string().min(1).trim(),
				playerName: z.string().trim().min(1).max(20),
			}),
			responses: {
				201: z.object({
					playerId: z.string(),
				}),
				404: gameplayNotFoundErrorSchema,
				409: gameplayJoinErrorSchema,
			},
		},
		leave: {
			path: "/gameplay/leave",
			method: "POST",
			body: z.object({
				gameCode: z.string().min(1).trim(),
				playerId: z.string(),
			}),
			responses: {
				200: z.object({
					ok: z.literal(true),
				}),
				404: gameplayNotFoundErrorSchema,
			},
		},
		verifyGame: {
			path: "/gameplay/verify-game",
			method: "GET",
			query: z.object({
				gameCode: z.string().min(1).trim(),
				playerId: z.string().optional(),
			}),
			responses: {
				200: z.object({
					gameState: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]),
				}),
				404: gameplayNotFoundErrorSchema,
			},
		},
		play: {
			path: "/gameplay/play",
			method: "GET",
			mode: "webSocket",
			query: z.object({
				gameCode: z.string().min(1).trim(),
				playerId: z.string(),
			}),
			messages: {
				client: gameplayClientMessageSchema,
				server: gameplayServerMessageSchema,
			},
		},
	},
});
