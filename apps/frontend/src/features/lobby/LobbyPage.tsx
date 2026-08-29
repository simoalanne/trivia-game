"use client";

import {
	gameplayTurnTimeoutSecondsDefault,
	gameplayTurnTimeoutSecondsMax,
	gameplayTurnTimeoutSecondsMin,
} from "@packages/contracts";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import {
	clearGameSessionCookie,
	type GameSessionCookie,
	readGameSessionCookie,
	saveGameSessionCookie,
} from "@/lib/gameSessionCookie";

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "An unexpected error occurred.";

export default function LobbyPage() {
	const { client, tq } = useApiClient();
	const router = useRouter();
	const [playerName, setPlayerName] = useState("");
	const [turnDurationSeconds, setTurnDurationSeconds] = useState(
		gameplayTurnTimeoutSecondsDefault,
	);
	const [resumeSession, setResumeSession] = useState<GameSessionCookie | null>(
		null,
	);
	const [, setIsCheckingSavedSession] = useState(true);
	const [isLeavingSavedSession, setIsLeavingSavedSession] = useState(false);

	const createGame = useMutation(tq.gameplay.create.mutationOptions());
	const isSubmitting = createGame.isPending || isLeavingSavedSession;

	useEffect(() => {
		let isCancelled = false;

		const verifySavedSession = async () => {
			const savedSession = await readGameSessionCookie();

			if (!savedSession) {
				if (!isCancelled) {
					setResumeSession(null);
					setIsCheckingSavedSession(false);
				}
				return;
			}

			const result =
				await client.gameplay.verifyGame.fetchResponse(savedSession);

			if (isCancelled) {
				return;
			}

			if (result.status === 200) {
				setResumeSession(savedSession);
				setIsCheckingSavedSession(false);
				return;
			}

			await clearGameSessionCookie();
			setResumeSession(null);
			setIsCheckingSavedSession(false);
		};

		void verifySavedSession();

		return () => {
			isCancelled = true;
		};
	}, [client]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedPlayerName = playerName.trim();
		if (!trimmedPlayerName) {
			return;
		}

		createGame.mutate(
			{
				playerName: trimmedPlayerName,
				turnDurationSeconds,
			},
			{
				onSuccess: async (session) => {
					await saveGameSessionCookie({
						gameCode: session.body.gameCode.toLowerCase(),
						playerId: session.body.playerId,
					});
					router.push("/gameplay");
				},
			},
		);
	};

	const leaveSavedSession = async () => {
		if (!resumeSession || isLeavingSavedSession) {
			return;
		}

		setIsLeavingSavedSession(true);

		try {
			await client.gameplay.leave.fetch(resumeSession);

			await clearGameSessionCookie();
			setResumeSession(null);
		} finally {
			setIsLeavingSavedSession(false);
		}
	};

	return (
		<main className="grid min-h-[calc(100vh-4rem)] place-items-start justify-items-center px-4 py-8 sm:px-8 lg:px-12">
			<section
				className="grid w-full max-w-136 gap-4"
				aria-labelledby="lobby-title"
			>
				<section
					className="card card-border w-full bg-base-100"
					aria-labelledby="create-game-title"
				>
					<div className="card-body gap-6">
						<div className="grid gap-2">
							<p className="font-bold text-primary">Lobby</p>
							<h1
								id="create-game-title"
								className="text-4xl leading-none font-bold"
							>
								Create a game
							</h1>
							<p className="text-base-content/70">
								Start a new game and invite your friends to join using a game
								code that will be provided after creation.
							</p>
						</div>
						{resumeSession ? (
							<div className="grid gap-4">
								<div role="alert" className="alert alert-warning alert-soft">
									<span>
										Finish or leave your current session before creating a new
										lobby.
									</span>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									<button
										className="btn btn-primary"
										disabled={isLeavingSavedSession}
										onClick={() => {
											router.push("/gameplay");
										}}
										type="button"
									>
										Resume game
									</button>
									<button
										className="btn btn-ghost"
										disabled={isLeavingSavedSession}
										onClick={() => {
											void leaveSavedSession();
										}}
										type="button"
									>
										{isLeavingSavedSession ? "Leaving..." : "Leave game"}
									</button>
								</div>
							</div>
						) : (
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

								{createGame.error ? (
									<p className="text-error font-semibold">
										{getErrorMessage(createGame.error)}
									</p>
								) : null}

								<div className="flex flex-wrap items-center gap-3">
									<button
										className="btn btn-primary"
										disabled={isSubmitting}
										type="submit"
									>
										Create lobby
									</button>
								</div>
							</form>
						)}
					</div>
				</section>
			</section>
		</main>
	);
}
