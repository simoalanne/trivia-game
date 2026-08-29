import type {
	GameplayServerMessage,
	GameplayState,
	TurnResolvedMessage,
} from "@packages/contracts";
import { contracts } from "@packages/contracts";
import { RouteResponseError, router } from "@rest-rpc/express";
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
	waitingForNextRoundReason: "JOINED_MID_ROUND" | "DONE_ANSWERING" | null;
	totalPoints: number;
	roundPoints: number;
	socket?: unknown;
};

type TriviaSourceCardEntry = {
	id: string;
	text: string;
	answer: PrismaJson.TriviaEntry["answer"];
};

type BaseActiveRound = {
	id: number;
	prompt: string;
	entries: TriviaSourceCardEntry[];
	answeredEntryIds: Set<string>;
};

type ActiveRound =
	| (BaseActiveRound & {
			answerMode: "TEXT";
	  })
	| (BaseActiveRound & {
			answerMode: "COUNTRY";
	  })
	| (BaseActiveRound & {
			answerMode: "CHOICES";
			choices: string[];
			choicesAreUnique: boolean;
	  });

type GameSession = {
	gameCode: string;
	players: GamePlayer[];
	currentRound: ActiveRound | null;
	gameState: GameState;
	round: number;
	playedThroughCardIds: number[];
	openedEntryIndex: number | null;
	turnDurationSeconds: number;
	turnRemainingMs: number | null;
	turnExpiresAt: string | null;
	isTurnPaused: boolean;
	turnTimeoutHandle: ReturnType<typeof setTimeout> | null;
};

type DbTriviaSourceCard = {
	id: number;
	data: PrismaJson.TriviaCardData;
};

const gameStore = new Map<string, GameSession>();
const initialTurnTimeoutGraceSeconds = 5;

const sendToPlayers = (
	gameSession: GameSession,
	message: GameplayServerMessage,
) => {
	gameSession.players.forEach((player) => {
		const playerSocket = player.socket as
			| { send: (payload: GameplayServerMessage) => void }
			| undefined;
		playerSocket?.send(message);
	});
};

const createPlayer = ({
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

const isAnswerCorrect = (
	expectedAnswer: PrismaJson.TriviaEntry["answer"],
	submittedAnswer: string,
) =>
	expectedAnswer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

const getAvailableChoices = (
	card: Extract<ActiveRound, { answerMode: "CHOICES" }>,
) => {
	if (card.choicesAreUnique) {
		const consumedChoices = new Set(
			card.entries
				.filter((entry) => card.answeredEntryIds.has(entry.id))
				.map((entry) => entry.answer),
		);

		return card.choices.filter((choice) => !consumedChoices.has(choice));
	}

	return card.choices;
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
				scheduleTurnTimeout(gameSession);
				return;
			}
		}
	}
};

const pickNextCard = async (excludedIds: number[] = []) => {
	const [nextCard] = (await prismaClient.$queryRawUnsafe(`
		SELECT "id", "data"
		FROM "TriviaCard"
		${excludedIds.length > 0 ? `WHERE id NOT IN (${excludedIds.join(",")})` : ""}
		ORDER BY RANDOM()
		LIMIT 1
		`)) as DbTriviaSourceCard[];

	if (!nextCard) {
		return null;
	}

	const baseRound = {
		id: nextCard.id,
		prompt: nextCard.data.prompt,
		entries: shuffleArray(
			nextCard.data.entries.map((entry, index) => ({
				id: String(index),
				text: entry.text,
				answer: entry.answer,
			})),
		),
		answeredEntryIds: new Set<string>(),
	};

	switch (nextCard.data.answerMode) {
		case "TEXT":
			return {
				...baseRound,
				answerMode: "TEXT" as const,
			};
		case "COUNTRY":
			return {
				...baseRound,
				answerMode: "COUNTRY" as const,
			};
		case "CHOICES":
			return {
				...baseRound,
				answerMode: "CHOICES" as const,
				choices: nextCard.data.choices,
				choicesAreUnique: nextCard.data.choicesAreUnique,
			};
	}
};

const endRound = async (gameSession: GameSession) => {
	const currentRound = getCurrentRoundOrThrow(gameSession);

	gameSession.players.forEach((player) => {
		player.totalPoints += player.roundPoints;
		player.roundPoints = 0;
		player.isParticipatingInCurrentRound = true;
		player.waitingForNextRoundReason = null;
		player.isPlayerTurn = false;
	});
	clearTurnTimeout(gameSession);
	gameSession.turnRemainingMs = null;
	gameSession.isTurnPaused = false;
	gameSession.openedEntryIndex = null;

	gameSession.playedThroughCardIds.push(currentRound.id);

	const nextCard = await pickNextCard(gameSession.playedThroughCardIds);
	if (!nextCard) {
		gameSession.currentRound = null;
		gameSession.gameState = "FINISHED";
		gameSession.players.forEach((player) => {
			player.isPlayerTurn = false;
			player.isParticipatingInCurrentRound = false;
		});
		gameSession.openedEntryIndex = null;
		clearTurnTimeout(gameSession);
		gameSession.turnRemainingMs = null;
		gameSession.isTurnPaused = false;
		return;
	}

	gameSession.round += 1;
	gameSession.currentRound = nextCard;
	gameSession.openedEntryIndex = null;
	gameSession.players.forEach((player, index) => {
		player.isPlayerTurn = index === 0;
	});
	scheduleTurnTimeout(gameSession);
};

const buildClientGameState = (gameSession: GameSession): GameplayState => {
	const activeRound = gameSession.currentRound;
	const card = !activeRound
		? null
		: activeRound.answerMode === "CHOICES"
			? {
					answerMode: "CHOICES" as const,
					prompt: activeRound.prompt,
					entries: activeRound.entries.map((entry) => {
						const isAnswered = activeRound.answeredEntryIds.has(entry.id);
						return {
							text: entry.text,
							answer: isAnswered ? entry.answer : null,
						};
					}),
					choices: getAvailableChoices(activeRound),
				}
			: {
					answerMode: activeRound.answerMode,
					prompt: activeRound.prompt,
					entries: activeRound.entries.map((entry) => {
						const isAnswered = activeRound.answeredEntryIds.has(entry.id);
						return {
							text: entry.text,
							answer: isAnswered ? entry.answer : null,
						};
					}),
				};

	return {
		card,
		players: gameSession.players.map(({ socket: _socket, ...player }) => ({
			...player,
		})),
		gameState: gameSession.gameState,
		round: gameSession.round,
		isTurnPaused: gameSession.isTurnPaused,
		turnDurationSeconds: gameSession.turnDurationSeconds,
		turnRemainingMs: gameSession.turnRemainingMs,
		turnExpiresAt: gameSession.turnExpiresAt,
	};
};

const addPlayer = (gameSession: GameSession, name: string) => {
	if (gameSession.gameState === "FINISHED") {
		throw new Error("Cannot join a game that has already finished");
	}

	if (
		gameSession.players.some(
			(player) => player.name.toLowerCase() === name.toLowerCase(),
		)
	) {
		throw new RouteResponseError(contracts.gameplay.join, {
			status: 409,
			body: { code: "PLAYER_NAME_TAKEN" },
		});
	}

	const MAX_PLAYERS_IN_GAME = 4;

	if (gameSession.players.length >= MAX_PLAYERS_IN_GAME) {
		throw new RouteResponseError(contracts.gameplay.join, {
			status: 409,
			body: { code: "GAME_FULL" },
		});
	}

	const player = createPlayer({
		name,
		isParticipatingInCurrentRound: gameSession.gameState !== "IN_PROGRESS",
		isReady: gameSession.gameState !== "NOT_STARTED",
		waitingForNextRoundReason:
			gameSession.gameState === "IN_PROGRESS" ? "JOINED_MID_ROUND" : null,
	});
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

const disconnectPlayerSocket = (
	gameSession: GameSession,
	playerId: string,
	socket: unknown,
) => {
	const player = gameSession.players.find(
		(currentPlayer) => currentPlayer.id === playerId,
	);
	if (!player || player.socket !== socket) {
		return false;
	}

	player.socket = undefined;
	return true;
};

const getNextParticipatingPlayer = (
	gameSession: GameSession,
	startIndex: number,
) => {
	for (let offset = 0; offset < gameSession.players.length; offset += 1) {
		const candidate =
			gameSession.players[(startIndex + offset) % gameSession.players.length];
		if (candidate?.isParticipatingInCurrentRound) {
			return candidate;
		}
	}

	return null;
};

const buildOpenedEntryState = (gameSession: GameSession) =>
	gameSession.openedEntryIndex;

const clearTurnTimeout = (gameSession: GameSession) => {
	if (gameSession.turnTimeoutHandle) {
		clearTimeout(gameSession.turnTimeoutHandle);
		gameSession.turnTimeoutHandle = null;
	}
	gameSession.turnExpiresAt = null;
};

const setTurnPaused = (
	gameSession: GameSession,
	playerId: string,
	paused: boolean,
) => {
	const player = getPlayerOrThrow(gameSession, playerId);
	if (!player.isHost) {
		throw new Error("Only the host can pause the turn");
	}
	if (
		gameSession.turnDurationSeconds === 0 ||
		gameSession.gameState !== "IN_PROGRESS"
	) {
		return;
	}
	if (gameSession.isTurnPaused === paused) {
		return;
	}

	if (paused) {
		gameSession.turnRemainingMs = getTurnRemainingMs(gameSession);
		clearTurnTimeout(gameSession);
		gameSession.isTurnPaused = true;
		return;
	}

	gameSession.isTurnPaused = false;
	scheduleTurnTimeout(gameSession);
};

const getTurnRemainingMs = (gameSession: GameSession) => {
	if (gameSession.turnExpiresAt) {
		return Math.max(
			0,
			new Date(gameSession.turnExpiresAt).getTime() - Date.now(),
		);
	}

	return gameSession.turnRemainingMs ?? 0;
};

const sendGameStateUpdate = (gameSession: GameSession) => {
	sendToPlayers(gameSession, {
		type: "gameStateUpdate",
		gameState: buildClientGameState(gameSession),
	});
};

const sendOpenedEntryUpdate = (
	gameSession: GameSession,
	entryIndex: number | null,
) => {
	sendToPlayers(gameSession, {
		type: "openedEntryUpdate",
		entryIndex,
	});
};

const sendOpenedEntryState = (gameSession: GameSession) => {
	sendOpenedEntryUpdate(gameSession, buildOpenedEntryState(gameSession));
};

const sendTurnResolved = (
	gameSession: GameSession,
	turnResolution: TurnResolvedMessage,
) => {
	sendToPlayers(gameSession, turnResolution);
};

const sendPlayersUpdate = (
	gameSession: GameSession,
	update: Pick<GamePlayer, "id" | "name"> & {
		kind: "join" | "leave";
	},
) => {
	sendToPlayers(gameSession, {
		type: "playersUpdate",
		kind: update.kind,
		playerId: update.id,
		playerName: update.name,
	});
};

const handleTurnTimedOut = async (
	gameSession: GameSession,
	playerId: string,
) => {
	const currentPlayer = gameSession.players.find(
		(player) => player.isPlayerTurn,
	);
	if (!currentPlayer || currentPlayer.id !== playerId) {
		return;
	}

	clearTurnTimeout(gameSession);
	gameSession.turnRemainingMs = null;
	gameSession.isTurnPaused = false;
	gameSession.openedEntryIndex = null;
	currentPlayer.isParticipatingInCurrentRound = false;
	currentPlayer.waitingForNextRoundReason = null;

	sendTurnResolved(gameSession, {
		type: "turnResolved",
		resolution: "timedOut",
		playerId: currentPlayer.id,
		playerName: currentPlayer.name,
	});

	await advanceGame(gameSession);
	sendGameStateUpdate(gameSession);
	sendOpenedEntryState(gameSession);
};

const scheduleTurnTimeout = (
	gameSession: GameSession,
	extraDurationSeconds: number = 0,
) => {
	clearTurnTimeout(gameSession);
	gameSession.isTurnPaused = false;

	if (
		gameSession.turnDurationSeconds === 0 ||
		gameSession.gameState !== "IN_PROGRESS"
	) {
		return;
	}

	const currentPlayer = gameSession.players.find(
		(player) => player.isPlayerTurn,
	);
	if (!currentPlayer) {
		return;
	}

	const timeoutMs =
		gameSession.turnRemainingMs ??
		(gameSession.turnDurationSeconds + extraDurationSeconds) * 1000;
	gameSession.turnRemainingMs = timeoutMs;
	gameSession.turnExpiresAt = new Date(Date.now() + timeoutMs).toISOString();
	gameSession.turnTimeoutHandle = setTimeout(() => {
		void handleTurnTimedOut(gameSession, currentPlayer.id);
	}, timeoutMs);
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
	gameSession.openedEntryIndex = null;
	gameSession.players.forEach((player, index) => {
		player.isParticipatingInCurrentRound = true;
		player.waitingForNextRoundReason = null;
		player.isPlayerTurn = index === 0;
	});
	scheduleTurnTimeout(gameSession, initialTurnTimeoutGraceSeconds);
};

const submitAnswer = (
	gameSession: GameSession,
	playerId: string,
	entryIndex: number,
	answer: string,
): TurnResolvedMessage => {
	const currentRound = getCurrentRoundOrThrow(gameSession);
	const currentPlayer = getCurrentTurnPlayerOrThrow(gameSession, playerId);

	const entry = currentRound.entries[entryIndex];

	if (!entry || currentRound.answeredEntryIds.has(entry.id)) {
		throw new Error("Invalid entry index");
	}

	const isCorrect = isAnswerCorrect(entry.answer, answer);
	currentRound.answeredEntryIds.add(entry.id);

	currentPlayer.roundPoints = isCorrect ? currentPlayer.roundPoints + 1 : 0;
	clearTurnTimeout(gameSession);
	gameSession.turnRemainingMs = null;
	gameSession.isTurnPaused = false;
	gameSession.openedEntryIndex = null;

	return {
		type: "turnResolved",
		resolution: "submitted",
		answer,
		correctAnswer: entry.answer,
		entryIndex,
		entryText: entry.text,
		isCorrect,
		playerId,
		playerName: currentPlayer.name,
		prompt: currentRound.prompt,
		answerMode: currentRound.answerMode,
	};
};

const doneAnswering = (gameSession: GameSession, playerId: string) => {
	const currentPlayer = getCurrentTurnPlayerOrThrow(gameSession, playerId);
	clearTurnTimeout(gameSession);
	gameSession.turnRemainingMs = null;
	gameSession.isTurnPaused = false;
	currentPlayer.isParticipatingInCurrentRound = false;
	currentPlayer.waitingForNextRoundReason = "DONE_ANSWERING";
	gameSession.openedEntryIndex = null;
};

const setOpenedEntry = (
	gameSession: GameSession,
	playerId: string,
	entryIndex: number | null,
) => {
	if (entryIndex === null) {
		gameSession.openedEntryIndex = null;
		return;
	}

	const currentRound = getCurrentRoundOrThrow(gameSession);
	getCurrentTurnPlayerOrThrow(gameSession, playerId);

	const entry = currentRound.entries[entryIndex];
	if (!entry || currentRound.answeredEntryIds.has(entry.id)) {
		throw new Error("Invalid entry index");
	}

	gameSession.openedEntryIndex = entryIndex;
};

const leaveGame = async (gameSession: GameSession, playerId: string) => {
	const playerIndex = gameSession.players.findIndex(
		(player) => player.id === playerId,
	);
	if (playerIndex === -1) {
		return false;
	}

	const [leavingPlayer] = gameSession.players.splice(playerIndex, 1);
	if (!leavingPlayer) {
		return false;
	}

	if (gameSession.players.length === 0) {
		clearTurnTimeout(gameSession);
		gameSession.turnRemainingMs = null;
		gameSession.turnExpiresAt = null;
		gameSession.isTurnPaused = false;
		gameSession.openedEntryIndex = null;
		gameStore.delete(gameSession.gameCode);
		return true;
	}

	sendPlayersUpdate(gameSession, {
		...leavingPlayer,
		kind: "leave",
	});

	if (leavingPlayer.isHost) {
		const nextHost = gameSession.players[0];
		if (nextHost) {
			nextHost.isHost = true;
		}
	}

	if (gameSession.gameState !== "IN_PROGRESS") {
		return true;
	}

	if (!leavingPlayer.isPlayerTurn) {
		return true;
	}

	const currentRound = getCurrentRoundOrThrow(gameSession);
	clearTurnTimeout(gameSession);
	gameSession.turnRemainingMs = null;
	gameSession.isTurnPaused = false;
	gameSession.openedEntryIndex = null;
	gameSession.players.forEach((player) => {
		player.isPlayerTurn = false;
	});

	const nextPlayer = getNextParticipatingPlayer(gameSession, playerIndex);
	if (
		currentRound.answeredEntryIds.size === currentRound.entries.length ||
		!nextPlayer
	) {
		await endRound(gameSession);
		return true;
	}

	nextPlayer.isPlayerTurn = true;
	scheduleTurnTimeout(gameSession);
	return true;
};

const handleLeaveGame = async (gameSession: GameSession, playerId: string) => {
	await leaveGame(gameSession, playerId);
	sendGameStateUpdate(gameSession);
	sendOpenedEntryState(gameSession);
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

const gameplayService = router(contracts.gameplay, {
	async create({ playerName, turnDurationSeconds }) {
		const gameSession = {
			gameCode: Array.from({ length: 6 }, () =>
				Math.random().toString(36).charAt(2),
			).join(""),
			currentRound: null,
			openedEntryIndex: null,
			players: [
				createPlayer({
					name: playerName,
					isHost: true,
				}),
			],
			gameState: "NOT_STARTED" as const,
			round: 1,
			playedThroughCardIds: [],
			turnDurationSeconds,
			turnRemainingMs: null,
			turnExpiresAt: null,
			isTurnPaused: false,
			turnTimeoutHandle: null,
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
		sendPlayersUpdate(gameSession, {
			...newPlayer,
			kind: "join",
		});
		sendGameStateUpdate(gameSession);
		sendOpenedEntryState(gameSession);
		return { playerId: newPlayer.id };
	},

	async leave({ gameCode, playerId }) {
		const gameSession = requireGameSession(gameCode);

		if (!hasPlayer(gameSession, playerId)) {
			throw new NotFoundError("Player not found in game");
		}

		await handleLeaveGame(gameSession, playerId);
		return { ok: true as const };
	},

	async verifyGame({ gameCode, playerId }) {
		const gameSession = requireGameSession(gameCode);

		if (playerId && !hasPlayer(gameSession, playerId)) {
			throw new NotFoundError("Player not found in game");
		}

		return {
			gameState: gameSession.gameState,
		};
	},

	async play({ gameCode, playerId, context }) {
		const { socket } = context;
		const gameSession = getGameSession(gameCode);
		if (!gameSession) {
			return socket.close(1008, "Game not found");
		}
		if (!hasPlayer(gameSession, playerId)) {
			return socket.close(1008, "Player not in game");
		}

		connectPlayerSocket(gameSession, playerId, socket);

		sendGameStateUpdate(gameSession);
		sendOpenedEntryState(gameSession);

		socket.onMessage(async (message) => {
			console.log("Received message from player", playerId, ":", message);

			switch (message.type) {
				case "toggleReady": {
					setPlayerReady(gameSession, playerId, message.state);
					break;
				}
				case "startGame": {
					await startGame(gameSession);
					break;
				}
				case "submitAnswer": {
					const turnResolution = submitAnswer(
						gameSession,
						playerId,
						message.entryIndex,
						message.answer,
					);
					sendTurnResolved(gameSession, turnResolution);
					await advanceGame(gameSession);
					break;
				}
				case "doneAnswering": {
					doneAnswering(gameSession, playerId);
					await advanceGame(gameSession);
					break;
				}
				case "leaveGame": {
					await handleLeaveGame(gameSession, playerId);
					socket.close(1000, "Player left game");
					return;
				}
				case "setOpenedEntry": {
					setOpenedEntry(gameSession, playerId, message.entryIndex);
					sendOpenedEntryUpdate(gameSession, message.entryIndex);
					break;
				}
				case "setTurnPaused": {
					setTurnPaused(gameSession, playerId, message.paused);
					break;
				}
			}
			if (message.type === "setOpenedEntry") {
				return;
			}
			sendGameStateUpdate(gameSession);
			sendOpenedEntryState(gameSession);
		});

		socket.onClose(() => {
			const didDisconnectCurrentSocket = disconnectPlayerSocket(
				gameSession,
				playerId,
				socket,
			);
			if (!didDisconnectCurrentSocket) {
				return;
			}

			const player = gameSession.players.find(
				(currentPlayer) => currentPlayer.id === playerId,
			);
			if (player?.isPlayerTurn) {
				gameSession.openedEntryIndex = null;
			}
			sendOpenedEntryUpdate(gameSession, gameSession.openedEntryIndex);
			console.log("Player disconnected", playerId);
		});
	},
});

export default gameplayService;
