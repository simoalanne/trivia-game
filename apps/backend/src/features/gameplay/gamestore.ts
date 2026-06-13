import type {
	TriviaCard,
	TriviaCardFormat,
} from "../../../generated/prisma/client.ts";
import prismaClient from "../../prisma.ts";

export type Player = {
	id: string;
	name: string;
	isHost: boolean;
	isReady: boolean;
	hasBankedRoundPoints: boolean;
	socket?: unknown;
};

export type CurrentCard = Omit<PrismaJson.TriviaCardData, "entries"> & {
	id: number;
	format: TriviaCardFormat;
	entries: (PrismaJson.TriviaEntry & {
		state: "unanswered" | "correct" | "incorrect";
	})[];
};

export type GameSession = {
	players: Player[];
	currentCard: CurrentCard | null;
	gameState: "waiting" | "in_progress" | "finished";
	round: number;
	scores: Record<string, number>;
	roundScores: Record<string, number>;
	playerTurnIndex: number;
	playedThroughCardIds: number[];
};

type MaybePromise<T> = T | Promise<T>;

const GAME_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const normalizeGameCode = (gameCode: string) => gameCode.trim().toLowerCase();

const createGameCode = (length = 5) => {
	const values = crypto.getRandomValues(new Uint32Array(length));
	return Array.from(
		values,
		(value) => GAME_CODE_ALPHABET[value % GAME_CODE_ALPHABET.length],
	).join("");
};

interface GameStore {
	get(id: string): MaybePromise<GameSessionManager | undefined>;
	store(game: GameSessionManager): MaybePromise<void>;
	update(game: GameSessionManager): MaybePromise<void>;
	delete(id: string): MaybePromise<void>;
}

class InMemoryGameStore implements GameStore {
	private games: Map<string, GameSessionManager> = new Map();

	async get(id: string) {
		return this.games.get(normalizeGameCode(id));
	}

	async store(game: GameSessionManager) {
		const gameCode = normalizeGameCode(game.id);
		if (this.games.has(gameCode)) {
			throw new Error("Game with this ID already exists");
		}
		this.games.set(gameCode, game);
	}

	async update(game: GameSessionManager) {
		const gameCode = normalizeGameCode(game.id);
		if (!this.games.has(gameCode)) {
			throw new Error("Game not found");
		}
		this.games.set(gameCode, game);
	}

	async delete(id: string) {
		this.games.delete(normalizeGameCode(id));
	}
}

export interface GameSessionManager {
	readonly id: string;

	/**
	 * Adds a new player to unstarted game session.
	 * @param name Player's display name
	 */
	addPlayer(name: string): MaybePromise<Player>;

	/**
	 * Removes a player from the game session. If the game has already started, this will also remove them from the turn order and scoring.
	 * @param playerId The ID of the player to remove
	 */
	removePlayer(playerId: string): MaybePromise<void>;

	/**
	 * Sets a player's ready status.
	 * @param playerId The ID of the player to update
	 * @param isReady The ready status to apply
	 */
	setPlayerReady(playerId: string, isReady: boolean): MaybePromise<void>;

	/**
	 * Starts the game if all players are ready. This will set the first card and initialize the turn order.
	 * Game can only be started from the "waiting" state and requires all players to be marked as ready. Once started, the game state will transition to "in_progress".
	 */
	startGame(): MaybePromise<void>;

	/**
	 * Retrieves the current game session state, including player info, current card, scores, and turn order.
	 */
	getCurrentGameSession(): MaybePromise<GameSession>;

	/**
	 * Submits an answer for the current card's active entry. This will check if the answer is correct, update the entry state, and adjust the player's round score accordingly.
	 * @param playerId The ID of the player submitting the answer
	 * @param entryIndex The index of the card entry being answered
	 * @param answer The player's submitted answer
	 */
	submitAnswer(
		playerId: string,
		entryIndex: number,
		answer: PrismaJson.TriviaCardData["entries"][number]["answer"],
	): MaybePromise<void>;

	/**
	 * Banks the player's current round score and removes them from the rest of the round's turn rotation.
	 * @param playerId The ID of the player banking their round points
	 */
	bankPoints(playerId: string): MaybePromise<void>;

	/**
	 * Advances the turn to the next player. This will update the playerTurnIndex to point to the next player in the turn order.
	 * The turn order is determined by the order of players in the game session, and will loop back to the beginning after reaching the end.
	 * This can only be called when there is an active card and the game is in progress.
	 */
	nextTurn(): MaybePromise<void>;

	/**
	 * Ends the current round and advances to the next card. This will mark the current card as played, pick a new random card that hasn't been played yet, and increment the round counter.
	 * This can only be called when there is an active card and the game is in progress. If there are no more cards available, it will throw an error.
	 */
	endRound(): MaybePromise<void>;
}

class InMemoryGameSessionManager implements GameSessionManager {
	private loadedCards: TriviaCard[] = [];
	private gameSession: GameSession;
	public readonly id: string;

	constructor(hostName: string) {
		this.id = createGameCode();
		const host = {
			id: crypto.randomUUID(),
			name: hostName,
			isHost: true,
			isReady: false,
			hasBankedRoundPoints: false,
		};
		const newSession: GameSession = {
			currentCard: null,
			players: [host],
			gameState: "waiting" as const,
			round: 1,
			scores: { [host.id]: 0 },
			roundScores: { [host.id]: 0 },
			playerTurnIndex: 0,
			playedThroughCardIds: [],
		};
		this.gameSession = newSession;
	}

	async addPlayer(name: string) {
		if (this.gameSession.gameState !== "waiting") {
			throw new Error("Cannot join a game that has already started");
		}
		const newPlayer: Player = {
			id: crypto.randomUUID(),
			name,
			isHost: false,
			isReady: false,
			hasBankedRoundPoints: false,
		};
		this.gameSession.players.push(newPlayer);
		this.gameSession.scores[newPlayer.id] = 0;
		this.gameSession.roundScores[newPlayer.id] = 0;
		return newPlayer;
	}

	async removePlayer(playerId: string) {
		this.gameSession.players = this.gameSession.players.filter(
			(p) => p.id !== playerId,
		);
		delete this.gameSession.scores[playerId];
		delete this.gameSession.roundScores[playerId];
	}

	async setPlayerReady(playerId: string, isReady: boolean) {
		const player = this.gameSession.players.find((p) => p.id === playerId);
		if (!player) {
			throw new Error("Player not found");
		}
		player.isReady = isReady;
	}

	async startGame() {
		if (this.gameSession.gameState !== "waiting") {
			throw new Error("Game has already started");
		}
		if (!this.gameSession.players.every((p) => p.isReady)) {
			throw new Error("All players must be ready to start the game");
		}
		this.gameSession.gameState = "in_progress";
		this.resetRoundState();
		this.gameSession.currentCard = await this.pickRandomCard(
			this.gameSession.playedThroughCardIds,
		);
	}

	async getCurrentGameSession() {
		return this.gameSession;
	}

	async submitAnswer(
		playerId: string,
		entryIndex: number,
		answer: PrismaJson.TriviaCardData["entries"][number]["answer"],
	) {
		if (!this.gameSession.currentCard) {
			throw new Error("No active card");
		}
		const currentPlayer =
			this.gameSession.players[this.gameSession.playerTurnIndex];
		if (currentPlayer?.id !== playerId) {
			throw new Error("It's not this player's turn");
		}
		if (currentPlayer.hasBankedRoundPoints) {
			throw new Error("This player has already banked points this round");
		}
		const entry = this.gameSession.currentCard.entries[entryIndex];
		if (!entry) {
			throw new Error("Invalid entry index");
		}
		if (entry.state !== "unanswered") {
			throw new Error("Entry already answered");
		}
		const hasMultipleAnswers = Array.isArray(entry.answer);
		const normalizedAnswer = answer.toString().trim().toLowerCase();
		const normalizedEntryAnswer = hasMultipleAnswers
			? (entry.answer as string[]).map((ans) =>
					ans.toString().trim().toLowerCase(),
				)
			: entry.answer.toString().trim().toLowerCase();
		const isCorrect =
			normalizedAnswer === normalizedEntryAnswer ||
			(hasMultipleAnswers &&
				(normalizedEntryAnswer as string[]).includes(normalizedAnswer));
		entry.state = isCorrect ? "correct" : "incorrect";
		if (isCorrect) {
			this.gameSession.roundScores[playerId] += 1;
		} else {
			this.gameSession.roundScores[playerId] = 0;
		}
	}

	async bankPoints(playerId: string) {
		if (!this.gameSession.currentCard) {
			throw new Error("No active card");
		}
		const currentPlayer =
			this.gameSession.players[this.gameSession.playerTurnIndex];
		if (currentPlayer?.id !== playerId) {
			throw new Error("It's not this player's turn");
		}
		if (currentPlayer.hasBankedRoundPoints) {
			throw new Error("This player has already banked points this round");
		}
		currentPlayer.hasBankedRoundPoints = true;
	}

	async nextTurn() {
		if (!this.gameSession.currentCard) {
			throw new Error("No active card");
		}
		const nextPlayerIndex = this.findNextActivePlayerIndex(
			this.gameSession.playerTurnIndex,
		);
		if (nextPlayerIndex === null) {
			throw new Error("No active players remaining in this round");
		}
		this.gameSession.playerTurnIndex = nextPlayerIndex;
	}

	async endRound() {
		if (!this.gameSession.currentCard) {
			throw new Error("No active card");
		}
		Object.keys(this.gameSession.roundScores).forEach((playerId) => {
			this.gameSession.scores[playerId] +=
				this.gameSession.roundScores[playerId];
		});
		this.gameSession.playedThroughCardIds.push(this.gameSession.currentCard.id);
		this.resetRoundState();
		this.gameSession.currentCard = await this.pickRandomCard(
			this.gameSession.playedThroughCardIds,
		);
		this.gameSession.round += 1;
	}

	private resetRoundState() {
		this.gameSession.players.forEach((player) => {
			player.hasBankedRoundPoints = false;
			this.gameSession.roundScores[player.id] = 0;
		});
		this.gameSession.playerTurnIndex = 0;
	}

	private findNextActivePlayerIndex(fromIndex: number) {
		const { players } = this.gameSession;
		if (players.length === 0) {
			return null;
		}
		for (let offset = 1; offset <= players.length; offset += 1) {
			const candidateIndex = (fromIndex + offset) % players.length;
			if (!players[candidateIndex]?.hasBankedRoundPoints) {
				return candidateIndex;
			}
		}
		return null;
	}

	private async getLoadedCards(limit = 100) {
		if (this.loadedCards.length > 0) {
			return this.loadedCards.slice(0, limit);
		}
		this.loadedCards = await prismaClient.triviaCard.findMany({
			take: limit,
		});
		return this.loadedCards;
	}

	private shuffleArray<T>(array: T[]) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	private async pickRandomCard(excludeIds: number[]) {
		const cards = await this.getLoadedCards();
		const availableCards = cards.filter(
			(card) => !excludeIds.includes(card.id),
		);
		if (availableCards.length === 0) {
			throw new Error("No more cards available");
		}
		const randomIndex = Math.floor(Math.random() * availableCards.length);
		const drawnCard = availableCards[randomIndex];
		const shuffledEntries = this.shuffleArray(drawnCard.data.entries);
		return {
			id: drawnCard.id,
			prompt: drawnCard.data.prompt,
			format: drawnCard.format,
			choices: drawnCard.data.choices,
			entries: shuffledEntries.map((entry) => ({
				...entry,
				state: "unanswered" as const,
			})),
		};
	}
}

export const gameStore: GameStore = new InMemoryGameStore();
export const createGameSessionManager = (hostName: string) =>
	new InMemoryGameSessionManager(hostName);
