"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Modal } from "@/components";
import { useApiClient } from "@/lib/apiClientProvider";
import {
	clearGameSessionCookie,
	type GameSessionCookie,
	readGameSessionCookie,
	saveGameSessionCookie,
} from "@/lib/gameSessionCookie";
import ConnectedGameplay from "./ConnectedGameplay";

type GameplayRouteState =
	| {
			kind: "loading";
	  }
	| {
			kind: "join";
			gameCode: string;
	  }
	| {
			kind: "gameplay";
			session: GameSessionCookie;
	  };

const normalizeGameCode = (value: string | null) => {
	const normalizedValue = value?.trim().toLowerCase() ?? "";
	return normalizedValue || null;
};

const resolveInviteRouteState = async ({
	api,
	gameCode,
	router,
	setRouteState,
}: {
	api: ReturnType<typeof useApiClient>;
	gameCode: string;
	router: ReturnType<typeof useRouter>;
	setRouteState: Dispatch<SetStateAction<GameplayRouteState>>;
}) => {
	const gameVerification = await api.gameplay.verifyGame.$tryFetch({
		gameCode,
	});

	if (
		!gameVerification.success ||
		gameVerification.data.gameState === "FINISHED"
	) {
		router.replace("/lobby");
		return;
	}

	setRouteState({
		kind: "join",
		gameCode,
	});
};

export default function GameplayPage() {
	const api = useApiClient();
	const router = useRouter();
	const searchParams = useSearchParams();
	const inviteGameCode = useMemo(
		() => normalizeGameCode(searchParams.get("gamecode")),
		[searchParams],
	);
	const [routeState, setRouteState] = useState<GameplayRouteState>({
		kind: "loading",
	});
	const [playerName, setPlayerName] = useState("");
	const joinGame = api.gameplay.join.useMutation();

	let errorMessage: string | null = null;

	if (joinGame.error) {
		if (joinGame.error.code === "PLAYER_NAME_TAKEN") {
			errorMessage =
				"This player name is already taken in this game. Please pick another name.";
		}
		if (joinGame.error.code === "GAME_FULL") {
			errorMessage = "This game is full and cannot accept new players.";
		}
		errorMessage ??= "An unexpected error occurred. Please try again.";
	}

	useEffect(() => {
		let isCancelled = false;

		const resolveRouteState = async () => {
			const savedSession = await readGameSessionCookie();

			if (savedSession) {
				const verification =
					await api.gameplay.verifyGame.$tryFetch(savedSession);

				if (isCancelled) {
					return;
				}

				if (verification.success) {
					if (inviteGameCode) {
						router.replace("/gameplay");
					}

					setRouteState({
						kind: "gameplay",
						session: savedSession,
					});
					return;
				}

				if (verification.error.status === 404) {
					await clearGameSessionCookie();
					if (inviteGameCode) {
						await resolveInviteRouteState({
							api,
							gameCode: inviteGameCode,
							router,
							setRouteState,
						});
						return;
					}

					router.replace("/lobby");
					return;
				}

				await clearGameSessionCookie();
				router.replace("/lobby");
				return;
			}

			if (inviteGameCode) {
				await resolveInviteRouteState({
					api,
					gameCode: inviteGameCode,
					router,
					setRouteState,
				});
				return;
			}

			router.replace("/lobby");
		};

		setRouteState({
			kind: "loading",
		});
		void resolveRouteState();

		return () => {
			isCancelled = true;
		};
	}, [api, inviteGameCode, router]);

	if (routeState.kind === "loading") {
		return (
			<main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-8 sm:px-8 lg:px-12">
				<div role="alert" className="alert alert-soft max-w-md">
					<span>Loading gameplay session...</span>
				</div>
			</main>
		);
	}

	if (routeState.kind === "join") {
		return (
			<main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-base-200 px-4 py-8 sm:px-8 lg:px-12">
				<div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
					<div className="card card-border w-full max-w-2xl bg-base-100/80 blur-xl">
						<div className="card-body gap-3">
							<h1 className="card-title text-3xl">Join game</h1>
							<p>
								Preparing invite flow for game{" "}
								{routeState.gameCode.toUpperCase()}.
							</p>
						</div>
					</div>
				</div>

				<Modal
					dismissible={false}
					footer={
						<div className="flex w-full items-center justify-end gap-3">
							<button
								className="btn"
								disabled={joinGame.isPending}
								onClick={() => {
									router.replace("/lobby");
								}}
								type="button"
							>
								Cancel
							</button>
							<button
								className="btn btn-primary"
								disabled={joinGame.isPending || playerName.trim().length === 0}
								onClick={() => {
									const trimmedPlayerName = playerName.trim();
									if (!trimmedPlayerName) {
										return;
									}

									joinGame.mutate(
										{
											gameCode: routeState.gameCode,
											playerName: trimmedPlayerName,
										},
										{
											onSuccess: async (session) => {
												await saveGameSessionCookie({
													gameCode: routeState.gameCode,
													playerId: session.playerId,
												});
												router.replace("/gameplay");
											},
										},
									);
								}}
								type="button"
							>
								{joinGame.isPending ? "Joining..." : "Join game"}
							</button>
						</div>
					}
					mobileSheet={false}
					open={true}
					setOpen={() => undefined}
					showCloseButton={false}
					size="md"
					title={`Join ${routeState.gameCode.toUpperCase()}`}
				>
					<div className="grid gap-4 px-3 pb-2">
						<p className="text-sm text-base-content/70">
							Enter your player name to join this game invite.
						</p>

						<fieldset className="fieldset w-full gap-2">
							<label
								className="fieldset-legend text-sm font-semibold"
								htmlFor="join-game-player-name"
							>
								Player name
							</label>
							<input
								className="input w-full"
								id="join-game-player-name"
								maxLength={20}
								onChange={(event) => setPlayerName(event.target.value)}
								placeholder="Your nickname"
								type="text"
								value={playerName}
							/>
						</fieldset>

						{joinGame.error ? (
							<p role="alert" className="alert alert-error alert-soft">
								{errorMessage}
							</p>
						) : null}
					</div>
				</Modal>
			</main>
		);
	}

	return <ConnectedGameplay session={routeState.session} />;
}
