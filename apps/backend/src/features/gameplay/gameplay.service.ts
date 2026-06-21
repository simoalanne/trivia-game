import type { GameplayState } from "@packages/contracts";
import type { TriviaCardFormat } from "../../../generated/prisma/client.ts";
import { defineService } from "../../initServer.ts";
import prismaClient from "../../prisma.ts";
import { NotFoundError } from "../../utils/NotFoundError.ts";

type GameState = GameplayState["gameState"];

type GamePlayer = {
	id: string;
	name: string;
	isHost: boolean;
	isReady: boolean;
	isPlayerTurn: boolean;
	isParticipatingInCurrentRound: boolean;
	totalPoints: number;
	roundPoints: number;
	socket?: unknown;
};

type TriviaSourceCardEntry = {
	id: string;
	text: string;
	answer: PrismaJson.TriviaEntry["answer"];
	explanation: string | null;
};

type ActiveRound = {
	id: number;
	format: TriviaCardFormat;
	prompt: string;
	uiHint: PrismaJson.TriviaCardData["uiHint"] | null;
	entries: TriviaSourceCardEntry[];
	choices: string[] | null;
	answeredEntryIds: Set<string>;
};

type GameSession = {
	gameCode: string;
	players: GamePlayer[];
	currentRound: ActiveRound | null;
	gameState: GameState;
	round: number;
	playedThroughCardIds: number[];
};

type DbTriviaSourceCard = {
	id: number;
	format: TriviaCardFormat;
	data: PrismaJson.TriviaCardData;
};

const gameStore = new Map<string, GameSession>();

const createPlayer = (name: string, isHost: boolean = false): GamePlayer => ({
	id: crypto.randomUUID(),
	name,
	isHost,
	isReady: false,
	isPlayerTurn: false,
	isParticipatingInCurrentRound: true,
	totalPoints: 0,
	roundPoints: 0,
});

const isAnswerCorrect = (
	expectedAnswer: PrismaJson.TriviaEntry["answer"],
	submittedAnswer: string,
) => {
	const candidates = Array.isArray(expectedAnswer)
		? expectedAnswer
		: [expectedAnswer];
	return candidates
		.map((answer) => String(answer).trim().toLowerCase())
		.includes(submittedAnswer.trim().toLowerCase());
};

const getAvailableChoices = (card: ActiveRound) => {
	if (card.format === "OPEN_ENDED") {
		return null;
	}
	if (card.format === "TRUE_OR_FALSE") {
		return ["true", "false"];
	}

	if (card.format === "ORDER_ITEMS") {
		const consumedChoices = new Set(
			card.entries
				.filter((entry) => card.answeredEntryIds.has(entry.id))
				.map((entry) => String(entry.answer)),
		);

		if (!card.choices) throw new Error("ORDER_ITEMS card must have choices");

		return card.choices.filter((choice) => !consumedChoices.has(choice));
	}

	return card.choices ?? null;
};

const shuffleArray = <T>(array: T[]) => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

const getPlayerOrThrow = (gameSession: GameSession, playerId: string) => {
	const player = gameSession.players.find(
		(currentPlayer) => currentPlayer.id === playerId,
	);
	if (!player) {
		throw new Error("Player not found");
	}
	return player;
};

const hasPlayer = (gameSession: GameSession, playerId: string) =>
	gameSession.players.some((player) => player.id === playerId);

const getCurrentRoundOrThrow = (gameSession: GameSession) => {
	if (!gameSession.currentRound) {
		throw new Error("No active round");
	}
	return gameSession.currentRound;
};

const getCurrentTurnPlayerOrThrow = (
	gameSession: GameSession,
	playerId: string,
) => {
	const currentPlayer = gameSession.players.find(
		(player) => player.isPlayerTurn,
	);
	if (currentPlayer?.id !== playerId) {
		throw new Error("It's not this player's turn");
	}
	if (!currentPlayer.isParticipatingInCurrentRound) {
		throw new Error("This player is not participating in the current round");
	}
	return currentPlayer;
};

const advanceGame = async (gameSession: GameSession) => {
	const { players, currentRound } = gameSession;
	if (!currentRound) {
		throw new Error("Game cannot be advanced if there is no active round");
	}
	const allQuestionsAnswered =
		currentRound.answeredEntryIds.size === currentRound.entries.length;
	const anyPlayersParticipating = players.some(
		(player) => player.isParticipatingInCurrentRound,
	);

	if (allQuestionsAnswered || !anyPlayersParticipating) {
		await endRound(gameSession);
		return;
	}

	for (let i = 0; i < players.length; i += 1) {
		const player = players[i];
		if (!player.isPlayerTurn) continue;
		player.isPlayerTurn = false;
		for (let j = 1; j <= players.length; j += 1) {
			const nextPlayer = players[(i + j) % players.length];
			if (nextPlayer.isParticipatingInCurrentRound) {
				nextPlayer.isPlayerTurn = true;
				return;
			}
		}
	}
};

const getBaseChoices = (dbCard: DbTriviaSourceCard) => {
	if (dbCard.format === "OPEN_ENDED") {
		return null;
	}
	if (dbCard.format === "TRUE_OR_FALSE") {
		return ["true", "false"];
	}

	if (dbCard.format === "ORDER_ITEMS") {
		return dbCard.data.entries.map((_, index) => String(index + 1));
	}

	return dbCard.data.choices ?? null;
};

const pickNextCard = async (excludedIds: number[] = []) => {
	const [nextCard] = (await prismaClient.$queryRawUnsafe(`
		SELECT "id", "format", "data"
		FROM "TriviaCard"
		${excludedIds.length > 0 ? `WHERE id NOT IN (${excludedIds.join(",")})` : ""}
		ORDER BY RANDOM()
		LIMIT 1
		`)) as DbTriviaSourceCard[];

	if (!nextCard) {
		return null;
	}

	return {
		id: nextCard.id,
		format: nextCard.format,
		prompt: nextCard.data.prompt,
		uiHint: nextCard.data.uiHint ?? null,
		entries: shuffleArray(
			nextCard.data.entries.map((entry, index) => ({
				id: String(index),
				text: entry.text,
				answer: entry.answer,
				explanation: entry.explanation ?? null,
			})),
		),
		choices: getBaseChoices(nextCard),
		answeredEntryIds: new Set<string>(),
	};
};

const endRound = async (gameSession: GameSession) => {
	const currentRound = getCurrentRoundOrThrow(gameSession);

	gameSession.players.forEach((player) => {
		player.totalPoints += player.roundPoints;
		player.roundPoints = 0;
		player.isParticipatingInCurrentRound = true;
		player.isPlayerTurn = false;
	});

	gameSession.playedThroughCardIds.push(currentRound.id);

	const nextCard = await pickNextCard(gameSession.playedThroughCardIds);
	if (!nextCard) {
		gameSession.currentRound = null;
		gameSession.gameState = "FINISHED";
		gameSession.players.forEach((player) => {
			player.isPlayerTurn = false;
			player.isParticipatingInCurrentRound = false;
		});
		return;
	}

	gameSession.round += 1;
	gameSession.currentRound = nextCard;
	gameSession.players[0].isPlayerTurn = true;
};

const buildClientGameState = (gameSession: GameSession): GameplayState => {
	const activeRound = gameSession.currentRound;
	const card = !activeRound
		? null
		: {
				uiHint: activeRound.uiHint ? ("COUNTRY" as const) : activeRound.format,
				prompt: activeRound.prompt,
				entries: activeRound.entries.map((entry) => {
					const isAnswered = activeRound.answeredEntryIds.has(entry.id);
					return {
						text: entry.text,
						answer: isAnswered
							? Array.isArray(entry.answer)
								? entry.answer.join(", ")
								: String(entry.answer)
							: null,
						explanation: isAnswered ? entry.explanation : null,
					};
				}),
				choices: getAvailableChoices(activeRound),
			};

	return {
		card,
		players: gameSession.players.map(({ socket: _socket, ...player }) => ({
			...player,
		})),
		gameState: gameSession.gameState,
		round: gameSession.round,
	};
};

const addPlayer = (gameSession: GameSession, name: string) => {
	if (gameSession.gameState !== "NOT_STARTED") {
		throw new Error("Cannot join a game that has already started");
	}

	const player = createPlayer(name);
	gameSession.players.push(player);
	return player;
};

const setPlayerReady = (
	gameSession: GameSession,
	playerId: string,
	isReady: boolean,
) => {
	getPlayerOrThrow(gameSession, playerId).isReady = isReady;
};

const connectPlayerSocket = (
	gameSession: GameSession,
	playerId: string,
	socket: unknown,
) => {
	getPlayerOrThrow(gameSession, playerId).socket = socket;
};

const startGame = async (gameSession: GameSession) => {
	if (gameSession.gameState !== "NOT_STARTED") {
		throw new Error("Game has already started");
	}
	if (!gameSession.players.every((player) => player.isReady)) {
		throw new Error("All players must be ready to start the game");
	}

	const nextCard = await pickNextCard();
	if (!nextCard) {
		throw new Error("No cards available to start the game");
	}

	gameSession.gameState = "IN_PROGRESS";
	gameSession.currentRound = nextCard;
	gameSession.players[0].isPlayerTurn = true;
};

const submitAnswer = (
	gameSession: GameSession,
	playerId: string,
	entryIndex: number,
	answer: string,
) => {
	const currentRound = getCurrentRoundOrThrow(gameSession);
	getCurrentTurnPlayerOrThrow(gameSession, playerId);

	const entry = currentRound.entries[entryIndex];

	if (!entry || currentRound.answeredEntryIds.has(entry.id)) {
		throw new Error("Invalid entry index");
	}

	const isCorrect = isAnswerCorrect(entry.answer, answer);
	currentRound.answeredEntryIds.add(entry.id);

	const currentPlayer = getPlayerOrThrow(gameSession, playerId);
	currentPlayer.roundPoints = isCorrect ? currentPlayer.roundPoints + 1 : 0;
};

const doneAnswering = (gameSession: GameSession, playerId: string) => {
	const currentPlayer = getCurrentTurnPlayerOrThrow(gameSession, playerId);
	currentPlayer.isParticipatingInCurrentRound = false;
};

const getGameSession = (gameCode: string) =>
	gameStore.get(gameCode.toLowerCase());

const requireGameSession = (gameCode: string) => {
	const gameSession = getGameSession(gameCode);
	if (!gameSession) {
		throw new NotFoundError("Game not found");
	}
	return gameSession;
};

export default defineService("gameplay", {
	async create({ playerName }) {
		const gameSession = {
			gameCode: Array.from({ length: 6 }, () =>
				Math.random().toString(36).charAt(2),
			).join(""),
			currentRound: null,
			players: [createPlayer(playerName, true)],
			gameState: "NOT_STARTED" as const,
			round: 1,
			playedThroughCardIds: [],
		};

		if (gameStore.has(gameSession.gameCode)) {
			throw new Error("Game code collision, please try again");
		}
		gameStore.set(gameSession.gameCode, gameSession);
		return {
			gameCode: gameSession.gameCode,
			playerId: gameSession.players[0].id,
		};
	},

	async join({ gameCode, playerName }) {
		const gameSession = requireGameSession(gameCode);
		const newPlayer = addPlayer(gameSession, playerName);
		return { playerId: newPlayer.id };
	},

	async verifySession({ gameCode, playerId }) {
		const gameSession = requireGameSession(gameCode);

		if (!hasPlayer(gameSession, playerId)) {
			throw new NotFoundError("Player not found in game");
		}

		return { ok: true as const };
	},

	async play({ gameCode, playerId, socket }) {
		const gameSession = getGameSession(gameCode);
		if (!gameSession) {
			return socket.close(1008, "Game not found");
		}
		if (!hasPlayer(gameSession, playerId)) {
			return socket.close(1008, "Player not in game");
		}

		connectPlayerSocket(gameSession, playerId, socket);

		const sendGameState = async () => {
			const gameState = buildClientGameState(gameSession);
			gameSession.players.forEach((player) => {
				const playerSocket = player.socket as typeof socket | undefined;
				playerSocket?.send({
					type: "gameStateUpdate",
					gameState,
				});
			});
		};

		await sendGameState(); // send initial game state on connection

		socket.onMessage(async (message) => {
			console.log("Received message from player", playerId, ":", message);
			if (!message.success) {
				socket.send({
					type: "gameError",
					message: "Invalid message format",
				});
				return;
			}

			switch (message.data.type) {
				case "toggleReady": {
					setPlayerReady(gameSession, playerId, message.data.state);
					break;
				}
				case "startGame": {
					await startGame(gameSession);
					break;
				}
				case "submitAnswer": {
					submitAnswer(
						gameSession,
						playerId,
						message.data.entryIndex,
						message.data.answer,
					);
					await advanceGame(gameSession);
					break;
				}
				case "doneAnswering": {
					doneAnswering(gameSession, playerId);
					await advanceGame(gameSession);
					break;
				}
			}
			await sendGameState();
		});

		socket.onClose(() => {
			console.log("Player disconnected", playerId);
		});
	},
});
