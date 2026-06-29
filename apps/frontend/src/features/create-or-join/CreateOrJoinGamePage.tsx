"use client";

import {
	gameplayTurnTimeoutSecondsDefault,
	gameplayTurnTimeoutSecondsMax,
	gameplayTurnTimeoutSecondsMin,
} from "@packages/contracts";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import { saveGameSessionCookie } from "./gameSessionCookie";

type Mode = "create" | "join";

export default function CreateOrJoinGamePage() {
	const api = useApiClient();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("create");
	const [playerName, setPlayerName] = useState("");
	const [gameCode, setGameCode] = useState("");
	const [turnDurationSeconds, setTurnDurationSeconds] = useState(
		gameplayTurnTimeoutSecondsDefault,
	);

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
					turnDurationSeconds,
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
		<main className="grid min-h-[calc(100vh-4rem)] place-items-start justify-items-center px-4 py-8 sm:px-8 lg:px-12">
			<section
				className="card card-border w-full max-w-[34rem] bg-base-100"
				aria-labelledby="create-join-title"
			>
				<div className="card-body gap-6">
					<div className="grid gap-2">
						<p className="font-bold text-primary">Setup</p>
						<h1
							id="create-join-title"
							className="text-4xl leading-none font-bold"
						>
							Create or join a game
						</h1>
						<p className="text-base-content/70">
							Start playing either by creating your own game lobby or joining an
							existing one with a game code from your friend.
						</p>
					</div>

					<div
						className="tabs tabs-box grid grid-cols-2"
						role="tablist"
						aria-label="Game setup mode"
					>
						<button
							aria-selected={mode === "create"}
							className={`tab ${mode === "create" ? "tab-active" : ""}`}
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
							className={`tab ${mode === "join" ? "tab-active" : ""}`}
							onClick={() => {
								setMode("join");
							}}
							role="tab"
							type="button"
						>
							Join
						</button>
					</div>

					<form className="grid gap-4" onSubmit={handleSubmit}>
						<fieldset className="fieldset w-full gap-2">
							<label
								className="fieldset-legend text-sm font-semibold"
								htmlFor="playerName"
							>
								Player name
							</label>
							<input
								className="input w-full"
								id="playerName"
								maxLength={20}
								onChange={(event) => setPlayerName(event.target.value)}
								placeholder="Your nickname"
								type="text"
								value={playerName}
							/>
						</fieldset>

						{mode === "join" && (
							<fieldset className="fieldset w-full gap-2">
								<label
									className="fieldset-legend text-sm font-semibold"
									htmlFor="gameCode"
								>
									Game code
								</label>
								<input
									className="input w-full"
									id="gameCode"
									onChange={(event) => setGameCode(event.target.value)}
									placeholder="Code from host"
									type="text"
									value={gameCode}
								/>
							</fieldset>
						)}

						{mode === "create" && (
							<fieldset className="fieldset w-full gap-2">
								<label
									className="fieldset-legend text-sm font-semibold"
									htmlFor="turnDurationSeconds"
								>
									{`Turn timer: ${
										turnDurationSeconds === 0
											? "Off"
											: `${turnDurationSeconds}s`
									}`}
								</label>
								<input
									className="range range-primary"
									id="turnDurationSeconds"
									max={gameplayTurnTimeoutSecondsMax}
									min={gameplayTurnTimeoutSecondsMin}
									onChange={(event) =>
										setTurnDurationSeconds(Number(event.target.value))
									}
									type="range"
									value={turnDurationSeconds}
								/>
							</fieldset>
						)}

						{activeError ? (
							<p className="text-error font-semibold">{activeError.message}</p>
						) : null}

						<div className="flex flex-wrap items-center gap-3">
							<button
								className="btn btn-primary"
								disabled={isSubmitting}
								type="submit"
							>
								{mode === "create" ? "Create new lobby" : "Join lobby"}
							</button>
						</div>
					</form>
				</div>
			</section>
		</main>
	);
}
