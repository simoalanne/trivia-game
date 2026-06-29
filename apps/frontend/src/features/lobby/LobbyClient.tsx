"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useGameplaySocket } from "@/features/gameplay/useGameplaySocket";
import { GameCode } from "../gameplay/components";

type LobbyClientProps = {
	gameCode: string;
};

export default function LobbyClient({ gameCode }: LobbyClientProps) {
	const router = useRouter();
	const { connectionState, error, gameState, playerId, send } =
		useGameplaySocket(gameCode);
	const gameCodePath = gameCode.toLowerCase();
	const currentPlayer = gameState?.players.find(
		(player) => player.id === playerId,
	);

	const allReady =
		Boolean(gameState?.players.length) &&
		gameState?.players.every((player) => player.isReady);
	const canSend = connectionState === "open" && Boolean(currentPlayer);

	useEffect(() => {
		if (gameState?.gameState === "IN_PROGRESS") {
			router.replace(`/play/${gameCodePath}`);
		}
	}, [gameCodePath, gameState?.gameState, router]);

	return (
		<main className="px-4 py-8 sm:px-8 lg:px-12">
			<section
				className="mx-auto grid max-w-4xl gap-6"
				aria-labelledby="lobby-title"
			>
				<div className="flex items-start justify-between gap-4 max-sm:grid">
					<div>
						<p className="mb-2 font-bold text-primary">Lobby</p>
						<h1 id="lobby-title" className="text-5xl leading-none font-bold">
							Waiting for players
						</h1>
					</div>
					<GameCode code={gameCode} />
				</div>
				{error ? (
					<p role="alert" className="alert alert-error alert-soft">
						{error}
					</p>
				) : null}

				<ul className="list gap-2" aria-label="Players in lobby">
					{gameState?.players.map((player) => (
						<li
							className={`list-row border border-base-300 bg-base-100 ${
								player.id === playerId ? "border-primary" : ""
							}`}
							key={player.id}
						>
							<div className="grid gap-1">
								<strong>{player.name}</strong>
								<span className="font-mono text-sm text-base-content/70">
									{player.isHost ? "Host" : "Player"}
									{player.id === playerId ? " - You" : ""}
								</span>
							</div>
							<span
								className={
									player.isReady
										? "badge badge-primary badge-soft"
										: "badge badge-ghost"
								}
							>
								{player.isReady ? "Ready" : "Waiting"}
							</span>
						</li>
					)) ?? (
						<li className="list-row border border-base-300 bg-base-100">
							<div className="grid gap-1">
								<strong>Connecting</strong>
								<span className="font-mono text-sm text-base-content/70">
									Loading players
								</span>
							</div>
							<span className="badge badge-ghost">Waiting</span>
						</li>
					)}
				</ul>

				<div className="flex flex-wrap gap-3">
					<button
						className="btn btn-primary"
						disabled={!canSend}
						onClick={() =>
							currentPlayer &&
							send({
								type: "toggleReady",
								state: !currentPlayer.isReady,
							})
						}
						type="button"
					>
						{currentPlayer?.isReady ? "Cancel ready" : "Ready up"}
					</button>
					<button
						className="btn"
						disabled={!canSend || !currentPlayer?.isHost || !allReady}
						onClick={() => send({ type: "startGame" })}
						type="button"
					>
						Start game
					</button>
				</div>
			</section>
		</main>
	);
}
