import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createApiClient } from "@/lib/apiClient";

const gameSessionCookieName = "triviaSession";

type GameSessionLayoutProps = {
	children: ReactNode;
};

type GameSessionCookie = {
	gameCode: string;
	playerId: string;
};

export default async function GameSessionLayout({
	children,
}: GameSessionLayoutProps) {
	const requestCookies = await cookies();
	const sessionCookie = requestCookies.get(gameSessionCookieName);

	if (!sessionCookie) {
		notFound();
	}

	const session = JSON.parse(
		decodeURIComponent(sessionCookie.value),
	) as GameSessionCookie;

	const response = await createApiClient().gameplay.verifySession.tryFetch(
		{
			gameCode: session.gameCode,
			playerId: session.playerId,
		},
		{ next: { revalidate: 0 } },
	);

	console.log("Session verification response:", response);

	if (!response.success && response.error.status === 404) {
		notFound();
	}

	if (!response.success) {
		throw new Error("Failed to verify game session");
	}

	return children;
}
