"use client";

import type { GameplayClientMessage, GameplaySession } from "@packages/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";

const gameSessionCookieName = "triviaSession";

type GameSessionCookie = {
	gameCode: string;
	playerId: string;
};

type ConnectionState = "connecting" | "open" | "closed" | "error";

const readGameSessionCookie = (): GameSessionCookie | null => {
	const cookie = document.cookie
		.split("; ")
		.find((value) => value.startsWith(`${gameSessionCookieName}=`));

	if (!cookie) {
		return null;
	}

	const encodedValue = cookie.slice(gameSessionCookieName.length + 1);
	try {
		return JSON.parse(decodeURIComponent(encodedValue)) as GameSessionCookie;
	} catch {
		return null;
	}
};

export function useGameplaySocket(gameCode: string) {
	const api = useApiClient();
	const normalizedGameCode = useMemo(() => gameCode.toLowerCase(), [gameCode]);
	const [playerId, setPlayerId] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameplaySession | null>(null);
	const [connectionState, setConnectionState] =
		useState<ConnectionState>("connecting");
	const [error, setError] = useState<string | null>(null);
	const [sendMessage, setSendMessage] = useState<
		((message: GameplayClientMessage) => boolean) | null
	>(null);

	useEffect(() => {
		const session = readGameSessionCookie();
		if (!session) {
			setConnectionState("error");
			setError("Game session cookie was not found.");
			return;
		}

		if (session.gameCode.toLowerCase() !== normalizedGameCode) {
			setConnectionState("error");
			setError("This browser is signed in to a different game.");
			return;
		}

		setPlayerId(session.playerId);
		setConnectionState("connecting");
		setError(null);

		const result = api.gameplay.play.$tryConnect({
			gameCode: normalizedGameCode,
			playerId: session.playerId,
		});

		if (!result.success) {
			setConnectionState("error");
			setError(result.error.message ?? "Could not open gameplay socket.");
			return;
		}

		const socket = result.data;
		const unsubscribeOpen = socket.onOpen(() => {
			setConnectionState("open");
		});
		const unsubscribeClose = socket.onClose((event) => {
			setConnectionState("closed");
			setSendMessage(null);
			if (event.code !== 1000) {
				setError(event.reason || "Gameplay socket closed.");
			}
		});
		const unsubscribeError = socket.onError(() => {
			setConnectionState("error");
			setError("Gameplay socket encountered an error.");
		});
		const unsubscribeMessage = socket.onMessage((result) => {
			if (!result.success) {
				setError("Backend sent an unexpected gameplay message.");
				return;
			}

			switch (result.data.type) {
				case "gameStateUpdate":
					setGameState(result.data.gameState);
					setError(null);
					break;
				case "gameError":
					setError(result.data.message);
					break;
			}
		});

		setSendMessage(() => (message: GameplayClientMessage) => {
			try {
				socket.send(message);
				return true;
			} catch (error) {
				const message =
					error && typeof error === "object" && "message" in error
						? String(error.message)
						: "Could not send gameplay message.";
				setError(message);
				return false;
			}
		});

		return () => {
			unsubscribeOpen();
			unsubscribeClose();
			unsubscribeError();
			unsubscribeMessage();
			setSendMessage(null);
			if (
				socket.readyState !== WebSocket.CLOSING &&
				socket.readyState !== WebSocket.CLOSED
			) {
				socket.close(1000, "Leaving gameplay route");
			}
		};
	}, [api, normalizedGameCode]);

	const send = useCallback(
		(message: GameplayClientMessage) => sendMessage?.(message) ?? false,
		[sendMessage],
	);

	return {
		connectionState,
		error,
		gameState,
		playerId,
		send,
	};
}
