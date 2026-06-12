import { defineService } from "../../initServer.ts";
import { NotFoundError } from "../../utils/NotFoundError.ts";
import { createGameSessionManager, gameStore } from "./gamestore.ts";

const createUniqueGameSession = async (playerName: string) => {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const gameSession = createGameSessionManager(playerName);
		if (!(await gameStore.get(gameSession.id))) {
			await gameStore.store(gameSession);
			return gameSession;
		}
	}

	throw new Error("Could not create a unique game code");
};

export default defineService("gameplay", {
	async create({ playerName }) {
		const gameSession = await createUniqueGameSession(playerName);
		const currentSession = await gameSession.getCurrentGameSession();
		const playerId = currentSession.players[0].id;
		const gameCode = gameSession.id;
		return { gameCode, playerId };
	},

	async join({ gameCode, playerName }) {
		const gameSession = await gameStore.get(gameCode);
		if (!gameSession) {
			throw new NotFoundError("Game not found");
		}
		const newPlayer = await gameSession.addPlayer(playerName);
		return { playerId: newPlayer.id };
	},

	async verifySession({ gameCode, playerId }) {
		const gameSession = await gameStore.get(gameCode);
		if (!gameSession) {
			throw new NotFoundError("Game not found");
		}

		const currentSession = await gameSession.getCurrentGameSession();
		const currentPlayer = currentSession.players.find((p) => p.id === playerId);
		if (!currentPlayer) {
			throw new NotFoundError("Player not found in game");
		}

		return { ok: true as const };
	},

	async play({ gameCode, playerId, socket }) {
		const gameSession = await gameStore.get(gameCode);
		if (!gameSession) {
			return socket.close(1008, "Game not found");
		}
		const currentSession = await gameSession.getCurrentGameSession();
		const currentPlayer = currentSession.players.find((p) => p.id === playerId);
		if (!currentPlayer) {
			return socket.close(1008, "Player not in game");
		}

		currentPlayer.socket = socket;

		const sendGameState = async () => {
			const session = await gameSession.getCurrentGameSession();
			session.players.forEach((player) => {
				const playerSocket = player.socket as typeof socket | undefined;
				playerSocket?.send({
					type: "gameStateUpdate",
					gameState: {
						...session,
						players: session.players.map(
							({ socket: _socket, ...player }) => player,
						),
					},
				});
			});
		};

		await sendGameState();

		socket.onMessage(async (message) => {
			console.log("Received message from player", playerId, ":", message);
			if (!message.success) {
				socket.send({
					type: "gameError",
					message: "Invalid message format",
				});
				return;
			}

			try {
				switch (message.data.type) {
					case "toggleReady": {
						await gameSession.setPlayerReady(playerId, message.data.state);
						break;
					}
					case "startGame": {
						await gameSession.startGame();
						break;
					}
					case "submitAnswer": {
						await gameSession.submitAnswer(
							playerId,
							message.data.entryIndex,
							message.data.answer,
						);
						const updatedSession = await gameSession.getCurrentGameSession();
						const allEntriesAnswered =
							updatedSession.currentCard?.entries.every(
								(entry) => entry.state !== "unanswered",
							);
						if (allEntriesAnswered) {
							await gameSession.endRound();
						} else {
							await gameSession.nextTurn();
						}
						break;
					}
					// Right now redundant if submitAnswer auto-advances but keeping for future flexibility
					case "nextTurn": {
						await gameSession.nextTurn();
						break;
					}
					case "endRound": {
						await gameSession.endRound();
						break;
					}
				}

				await sendGameState();
			} catch (error) {
				console.error("Gameplay message handler failed", {
					gameCode,
					playerId,
					messageType: message.data.type,
					error,
				});
				socket.send({
					type: "gameError",
					message:
						error instanceof Error
							? error.message
							: "Unexpected gameplay error",
				});
			}
		});
	},
});
