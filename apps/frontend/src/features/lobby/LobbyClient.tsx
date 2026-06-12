"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components";
import { useGameplaySocket } from "@/features/gameplay/useGameplaySocket";
import styles from "./LobbyPage.module.css";

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
	const readyCount =
		gameState?.players.filter((player) => player.isReady).length ?? 0;
	const allReady =
		Boolean(gameState?.players.length) &&
		gameState?.players.every((player) => player.isReady);
	const canSend = connectionState === "open" && Boolean(currentPlayer);

	useEffect(() => {
		if (gameState?.gameState === "in_progress") {
			router.replace(`/play/${gameCodePath}`);
		}
	}, [gameCodePath, gameState?.gameState, router]);

	return (
		<main className={styles.page}>
			<section className={styles.lobby} aria-labelledby="lobby-title">
				<div className={styles.header}>
					<div>
						<p className={styles.kicker}>Lobby</p>
						<h1 id="lobby-title">Waiting for players</h1>
					</div>
					<div className={styles.codeBlock}>
						<span>Game code</span>
						<strong>{gameCode.toUpperCase()}</strong>
					</div>
				</div>

				<div className={styles.statusBar}>
					<span>{gameState?.players.length ?? 0} players</span>
					<span>{readyCount} ready</span>
					<span>{connectionState}</span>
				</div>

				{error ? <p className={styles.errorMessage}>{error}</p> : null}

				<ul className={styles.playerList} aria-label="Players in lobby">
					{gameState?.players.map((player) => (
						<li
							className={`${styles.playerRow} ${
								player.id === playerId ? styles.currentPlayer : ""
							}`}
							key={player.id}
						>
							<div>
								<strong>{player.name}</strong>
								<span>
									{player.isHost ? "Host" : "Player"}
									{player.id === playerId ? " - You" : ""}
								</span>
							</div>
							<span
								className={
									player.isReady ? styles.readyBadge : styles.waitingBadge
								}
							>
								{player.isReady ? "Ready" : "Waiting"}
							</span>
						</li>
					)) ?? (
						<li className={styles.playerRow}>
							<div>
								<strong>Connecting</strong>
								<span>Loading players</span>
							</div>
							<span className={styles.waitingBadge}>Waiting</span>
						</li>
					)}
				</ul>

				<div className={styles.actions}>
					<Button
						disabled={!canSend}
						onClick={() =>
							currentPlayer &&
							send({
								type: "toggleReady",
								state: !currentPlayer.isReady,
							})
						}
					>
						{currentPlayer?.isReady ? "Cancel ready" : "Ready up"}
					</Button>
					<Button
						disabled={!canSend || !currentPlayer?.isHost || !allReady}
						onClick={() => send({ type: "startGame" })}
						variant="secondary"
					>
						Start game
					</Button>
				</div>
			</section>
		</main>
	);
}
