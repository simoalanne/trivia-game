const gameSessionCookieName = "triviaSession";
const oneDayMs = 24 * 60 * 60 * 1000;

type GameSessionCookie = {
	gameCode: string;
	playerId: string;
};

export async function saveGameSessionCookie(session: GameSessionCookie) {
	await cookieStore.set({
		name: gameSessionCookieName,
		value: encodeURIComponent(JSON.stringify(session)),
		expires: Date.now() + oneDayMs,
		path: "/",
		sameSite: "lax",
	});
}
