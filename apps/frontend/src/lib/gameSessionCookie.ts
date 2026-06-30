const gameSessionCookieName = "triviaSession";
const oneDayMs = 24 * 60 * 60 * 1000;

export type GameSessionCookie = {
	gameCode: string;
	playerId: string;
};

export async function readGameSessionCookie(): Promise<GameSessionCookie | null> {
	if (typeof cookieStore === "undefined") {
		return null;
	}

	const cookie = await cookieStore.get(gameSessionCookieName);
	if (!cookie || typeof cookie.value !== "string") {
		return null;
	}

	try {
		return JSON.parse(decodeURIComponent(cookie.value)) as GameSessionCookie;
	} catch {
		return null;
	}
}

export async function saveGameSessionCookie(session: GameSessionCookie) {
	if (typeof cookieStore === "undefined") {
		return;
	}

	await cookieStore.set({
		name: gameSessionCookieName,
		value: encodeURIComponent(JSON.stringify(session)),
		expires: Date.now() + oneDayMs,
		path: "/",
		sameSite: "lax",
	});
}

export async function clearGameSessionCookie() {
	if (typeof cookieStore === "undefined") {
		return;
	}

	await cookieStore.delete({
		name: gameSessionCookieName,
		path: "/",
	});
}
