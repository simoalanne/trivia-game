"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button, Field, TextInput } from "@/components";
import { useApiClient } from "@/lib/apiClientProvider";
import styles from "./CreateOrJoinGamePage.module.css";
import { saveGameSessionCookie } from "./gameSessionCookie";

type Mode = "create" | "join";

export default function CreateOrJoinGamePage() {
	const api = useApiClient();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("create");
	const [playerName, setPlayerName] = useState("");
	const [gameCode, setGameCode] = useState("");

	const createGame = api.gameplay.create.useMutation();
	const joinGame = api.gameplay.join.useMutation();
	const isSubmitting = createGame.isPending || joinGame.isPending;
	const activeError = mode === "create" ? createGame.error : joinGame.error;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedPlayerName = playerName.trim();
		const normalizedGameCode = gameCode.trim().toLowerCase();

		if (!trimmedPlayerName) {
			return;
		}

		if (mode === "join" && !normalizedGameCode) {
			return;
		}

		if (mode === "create") {
			createGame.mutate(
				{
					playerName: trimmedPlayerName,
				},
				{
					onSuccess: async (session) => {
						const sessionGameCode = session.gameCode.toLowerCase();
						await saveGameSessionCookie({
							gameCode: sessionGameCode,
							playerId: session.playerId,
						});
						router.push(`/play/${sessionGameCode}/lobby`);
					},
				},
			);
			return;
		}

		joinGame.mutate(
			{
				gameCode: normalizedGameCode,
				playerName: trimmedPlayerName,
			},
			{
				onSuccess: async (session) => {
					await saveGameSessionCookie({
						gameCode: normalizedGameCode,
						playerId: session.playerId,
					});
					router.push(`/play/${normalizedGameCode}/lobby`);
				},
			},
		);
	};

	return (
		<main className={styles.page}>
			<section className={styles.panel} aria-labelledby="create-join-title">
				<div className={styles.header}>
					<p className={styles.kicker}>Setup</p>
					<h1 id="create-join-title">Create or join a game</h1>
					<p>
						Start playing either by creating your own game lobby or joining an
						existing one with a game code from your friend.
					</p>
				</div>

				<div
					className={styles.tabs}
					role="tablist"
					aria-label="Game setup mode"
				>
					<button
						aria-selected={mode === "create"}
						className={styles.tab}
						onClick={() => {
							setMode("create");
						}}
						role="tab"
						type="button"
					>
						Create
					</button>
					<button
						aria-selected={mode === "join"}
						className={styles.tab}
						onClick={() => {
							setMode("join");
						}}
						role="tab"
						type="button"
					>
						Join
					</button>
				</div>

				<form className={styles.form} onSubmit={handleSubmit}>
					<Field htmlFor="playerName" label="Player name">
						<TextInput
							id="playerName"
							maxLength={20}
							onChange={(event) => setPlayerName(event.target.value)}
							placeholder="Your nickname"
							type="text"
							value={playerName}
						/>
					</Field>

					{mode === "join" && (
						<Field htmlFor="gameCode" label="Game code">
							<TextInput
								id="gameCode"
								onChange={(event) => setGameCode(event.target.value)}
								placeholder="Code from host"
								type="text"
								value={gameCode}
							/>
						</Field>
					)}

					{activeError ? (
						<p className={styles.errorMessage}>{activeError.message}</p>
					) : null}

					<div className={styles.actions}>
						<Button disabled={isSubmitting} type="submit">
							{mode === "create" ? "Create new lobby" : "Join lobby"}
						</Button>
					</div>
				</form>
			</section>
		</main>
	);
}
