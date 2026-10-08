import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
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
		type: z.literal("unexpectedError"),
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
export type TurnResolvedMessage = Extract<
	GameplayServerMessage,
	{ type: "turnResolved" }
>;
export type PlayersUpdateMessage = Extract<
	GameplayServerMessage,
	{ type: "playersUpdate" }
>;

const gameCodeSchema = z.string().min(1).trim();
const playerNameSchema = z.string().trim().min(1).max(20);

const gameNotFoundError = {
	NOT_FOUND: {
		message: "Game or player not found",
	},
} as const;

const gameplay = oc.meta(
	openapi({
		tags: ["Gameplay"],
		inputStructure: "detailed",
		outputStructure: "detailed",
	}),
);

export const gameplayContract = {
	create: gameplay
		.meta(
			openapi({
				method: "POST",
				path: "/gameplay/create",
				operationId: "createGame",
				summary: "Create a game",
				description: "Creates a new game hosted by the given player.",
				successStatus: 201,
				successDescription: "The game code and the host's player id",
			}),
		)
		.input(
			z.object({
				body: z.object({
					playerName: playerNameSchema,
					turnDurationSeconds: z
						.int()
						.min(gameplayTurnTimeoutSecondsMin)
						.max(gameplayTurnTimeoutSecondsMax)
						.default(gameplayTurnTimeoutSecondsDefault),
				}),
			}),
		)
		.output(
			z.object({
				status: z.literal(201),
				body: z.object({
					gameCode: z.string(),
					playerId: z.string(),
				}),
			}),
		),
	join: gameplay
		.meta(
			openapi({
				method: "POST",
				path: "/gameplay/join",
				operationId: "joinGame",
				summary: "Join a game",
				successStatus: 201,
				successDescription: "The joining player's id",
			}),
		)
		.errors({
			...gameNotFoundError,
			CONFLICT: {
				message: "Could not join the game",
				data: z.object({
					reason: z.union([
						z
							.literal("PLAYER_NAME_TAKEN")
							.describe(
								"The player name is already taken in this game. Names are case-insensitive and must be unique.",
							),
						z
							.literal("GAME_FULL")
							.describe("The game is full and cannot accept new players."),
					]),
				}),
			},
		})
		.input(
			z.object({
				body: z.object({
					gameCode: gameCodeSchema,
					playerName: playerNameSchema,
				}),
			}),
		)
		.output(
			z.object({
				status: z.literal(201),
				body: z.object({
					playerId: z.string(),
				}),
			}),
		),
	leave: gameplay
		.meta(
			openapi({
				method: "POST",
				path: "/gameplay/leave",
				operationId: "leaveGame",
				summary: "Leave a game",
				successDescription: "The player left the game",
			}),
		)
		.errors(gameNotFoundError)
		.input(
			z.object({
				body: z.object({
					gameCode: gameCodeSchema,
					playerId: z.string(),
				}),
			}),
		)
		.output(
			z.object({
				status: z.literal(200),
				body: z.object({
					ok: z.literal(true),
				}),
			}),
		),
	verifyGame: gameplay
		.meta(
			openapi({
				method: "GET",
				path: "/gameplay/verify-game",
				operationId: "verifyGame",
				summary: "Check a game and, optionally, a player in it",
				successDescription: "The game's current state",
			}),
		)
		.errors(gameNotFoundError)
		.input(
			z.object({
				query: z.object({
					gameCode: gameCodeSchema,
					playerId: z.string().optional(),
				}),
			}),
		)
		.output(
			z.object({
				status: z.literal(200),
				body: z.object({
					gameState: z.enum(["NOT_STARTED", "IN_PROGRESS", "FINISHED"]),
				}),
			}),
		),
};

export default router({
	gameplay: {
		play: {
			path: "/gameplay/play",
			method: "GET",
			mode: "webSocket",
			query: z.object({
				gameCode: gameCodeSchema,
				playerId: z.string(),
			}),
			messages: {
				client: gameplayClientMessageSchema,
				server: gameplayServerMessageSchema,
			},
		},
	},
});
