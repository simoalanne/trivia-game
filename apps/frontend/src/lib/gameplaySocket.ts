import {
	type GameplayClientMessage,
	type GameplayServerMessage,
	gameplayServerMessageSchema,
	gameplaySocketPath,
} from "@packages/contracts";

export type GameplaySocketQuery = {
	gameCode: string;
	playerId: string;
};

const toWebSocketUrl = (baseUrl: string, query: GameplaySocketQuery) => {
	const url = `${baseUrl.replace(/\/$/, "")}${gameplaySocketPath}?${new URLSearchParams(query)}`;
	return url.replace(/^http(s?):/, "ws$1:");
};

const parseServerMessage = (data: unknown) => {
	try {
		const result = gameplayServerMessageSchema.safeParse(
			JSON.parse(String(data)),
		);
		if (result.success) {
			return result.data;
		}
		console.error("Dropped invalid gameplay message", result.error);
	} catch (error) {
		console.error("Dropped unparseable gameplay message", error);
	}
	return null;
};

/** A typed gameplay WebSocket. Listener methods return an unsubscribe function. */
export const openGameplaySocket = (
	baseUrl: string,
	query: GameplaySocketQuery,
) => {
	const socket = new WebSocket(toWebSocketUrl(baseUrl, query));

	const listen = <K extends keyof WebSocketEventMap>(
		type: K,
		callback: (event: WebSocketEventMap[K]) => void,
	) => {
		socket.addEventListener(type, callback);
		return () => socket.removeEventListener(type, callback);
	};

	return {
		get readyState() {
			return socket.readyState;
		},
		send(message: GameplayClientMessage) {
			if (socket.readyState !== WebSocket.OPEN) {
				throw new Error("WebSocket is not open");
			}
			socket.send(JSON.stringify(message));
		},
		close(code?: number, reason?: string) {
			socket.close(code, reason);
		},
		onOpen: (callback: (event: Event) => void) => listen("open", callback),
		onClose: (callback: (event: CloseEvent) => void) =>
			listen("close", callback),
		onError: (callback: (event: Event) => void) => listen("error", callback),
		onMessage: (callback: (message: GameplayServerMessage) => void) =>
			listen("message", (event) => {
				const message = parseServerMessage(event.data);
				if (message) {
					callback(message);
				}
			}),
	};
};

export type GameplaySocket = ReturnType<typeof openGameplaySocket>;
