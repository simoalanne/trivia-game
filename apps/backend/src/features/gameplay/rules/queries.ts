import type { GameSession } from "../gameplay.types.ts";

export const getPlayerOrThrow = (session: GameSession, playerId: string) => {
	const player = session.players.find(
		(currentPlayer) => currentPlayer.id === playerId,
	);
	if (!player) {
		throw new Error("Player not found");
	}
	return player;
};

export const hasPlayer = (session: GameSession, playerId: string) =>
	session.players.some((player) => player.id === playerId);

export const getCurrentRoundOrThrow = (session: GameSession) => {
	if (!session.currentRound) {
		throw new Error("No active round");
	}
	return session.currentRound;
};

export const getCurrentTurnPlayerOrThrow = (
	session: GameSession,
	playerId: string,
) => {
	const currentPlayer = session.players.find((player) => player.isPlayerTurn);
	if (currentPlayer?.id !== playerId) {
		throw new Error("It's not this player's turn");
	}
	if (!currentPlayer.isParticipatingInCurrentRound) {
		throw new Error("This player is not participating in the current round");
	}
	return currentPlayer;
};

export const getNextParticipatingPlayer = (
	session: GameSession,
	startIndex: number,
) => {
	for (let offset = 0; offset < session.players.length; offset += 1) {
		const candidate =
			session.players[(startIndex + offset) % session.players.length];
		if (candidate?.isParticipatingInCurrentRound) {
			return candidate;
		}
	}

	return null;
};
