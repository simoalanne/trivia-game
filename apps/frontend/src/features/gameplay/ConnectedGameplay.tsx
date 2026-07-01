"use client";

import type {
	GameplayClientMessage,
	GameplayState,
	PlayersUpdateMessage,
	TurnResolvedMessage,
} from "@packages/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SidebarLayout } from "@/components";
import { useApiClient } from "@/lib/apiClientProvider";
import {
	clearGameSessionCookie,
	type GameSessionCookie,
} from "@/lib/gameSessionCookie";
import { AnswerResolutionToast } from "./AnswerResolutionToast";
import styles from "./ConnectedGameplay.module.css";
import GameplayFinishedView from "./GameplayFinishedView";
import GameplayInProgressView from "./GameplayInProgressView";
import { useTimedGameplayMessage } from "./GameplayMessage";
import GameplayNotStartedView from "./GameplayNotStartedView";
import { GameplaySidebar } from "./GameplaySidebar";
import PlayerPresenceToast from "./PlayerPresenceToast";

const answerResolutionDurationMs = 1200;

type ConnectedGameplayProps = {
	session: GameSessionCookie;
};

type ConnectionState = "connecting" | "open" | "closed" | "error";

const getCurrentTurnPlayer = (gameState: GameplayState | null) =>
	gameState?.players.find((player) => player.isPlayerTurn) ?? null;

export default function ConnectedGameplay({ session }: ConnectedGameplayProps) {
	const api = useApiClient();
	const router = useRouter();
	const normalizedGameCode = useMemo(
		() => session.gameCode.toLowerCase(),
		[session.gameCode],
	);
	const [playerId, setPlayerId] = useState<string | null>(null);
	const [gameState, setGameState] = useState<GameplayState | null>(null);
	const [answerResolution, setAnswerResolution] =
		useState<TurnResolvedMessage | null>(null);
	const [openedEntryIndex, setOpenedEntryIndex] = useState<number | null>(null);
	const [connectionState, setConnectionState] =
		useState<ConnectionState>("connecting");
	const [error, setError] = useState<string | null>(null);
	const [sendMessage, setSendMessage] = useState<
		((message: GameplayClientMessage) => boolean) | null
	>(null);
	const [leaveGameMessage, setLeaveGameMessage] = useState<
		(() => Promise<void>) | null
	>(null);
	const [activeAnswerEntryIndex, setActiveAnswerEntryIndex] = useState<
		number | null
	>(null);
	const [isAnswerPanelOpen, setIsAnswerPanelOpen] = useState(false);
	const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
	const [answerPanelResult, setAnswerPanelResult] = useState<{
		answer: string;
		isCorrect: boolean;
	} | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const {
		message: answerResolutionToast,
		showMessage: showAnswerResolutionToast,
	} = useTimedGameplayMessage<TurnResolvedMessage>(answerResolutionDurationMs);
	const { message: playerPresenceToast, showMessage: showPlayerPresenceToast } =
		useTimedGameplayMessage<PlayersUpdateMessage>(answerResolutionDurationMs);
	const [remainingTurnMs, setRemainingTurnMs] = useState<number | null>(null);
	const [isLeavingGame, setIsLeavingGame] = useState(false);
	const inviteHref = `/gameplay?gamecode=${encodeURIComponent(normalizedGameCode)}`;
	const currentCard = gameState?.card ?? null;
	const currentPlayer =
		gameState?.players.find((player) => player.id === playerId) ?? null;
	const turnPlayer = getCurrentTurnPlayer(gameState);
	const canSend = connectionState === "open" && Boolean(currentPlayer);
	const canAnswer =
		canSend &&
		Boolean(currentPlayer?.isPlayerTurn) &&
		Boolean(currentPlayer?.isParticipatingInCurrentRound) &&
		!gameState?.isTurnPaused;
	const waitingForNextRoundReason =
		gameState?.gameState === "IN_PROGRESS"
			? (currentPlayer?.waitingForNextRoundReason ?? null)
			: null;
	const turnTimeoutEnabled = (gameState?.turnDurationSeconds ?? 0) > 0;
	const canTogglePause =
		connectionState === "open" &&
		Boolean(currentPlayer?.isHost) &&
		gameState?.gameState === "IN_PROGRESS" &&
		turnTimeoutEnabled;
	const allReady =
		Boolean(gameState?.players.length) &&
		Boolean(gameState?.players.every((player) => player.isReady));
	const triviaItems =
		currentCard?.entries.map((entry, entryIndex) => ({
			id: String(entryIndex),
			label: entry.text,
			answer: entry.answer ?? undefined,
			answerUiHint:
				currentCard.answerMode === "COUNTRY" ? ("country" as const) : undefined,
			disabled: entry.answer !== null || !canAnswer,
			highlightColor: "blue",
		})) ?? [];
	const selectedEntry =
		activeAnswerEntryIndex !== null && currentCard
			? (currentCard.entries[activeAnswerEntryIndex] ?? null)
			: null;
	const canAnswerSelectedEntry = Boolean(
		activeAnswerEntryIndex !== null &&
			selectedEntry &&
			selectedEntry.answer === null &&
			canAnswer &&
			!isSubmittingAnswer &&
			!answerPanelResult,
	);
	const selectedCardKey = `${gameState?.round ?? 0}:${currentCard?.prompt ?? ""}`;
	const previousCardKeyRef = useRef(selectedCardKey);

	useEffect(() => {
		setPlayerId(session.playerId);
		setConnectionState("connecting");
		setError(null);
		setAnswerResolution(null);
		setOpenedEntryIndex(null);
		setLeaveGameMessage(null);

		const result = api.gameplay.play.$tryConnect({
			gameCode: normalizedGameCode,
			playerId: session.playerId,
		});

		if (!result.success) {
			setConnectionState("error");
			setError(result.error.message ?? "Could not open gameplay socket.");
			return;
		}

		const socket = result.data;
		const unsubscribeOpen = socket.onOpen(() => {
			setConnectionState("open");
		});
		const unsubscribeClose = socket.onClose((event) => {
			setConnectionState("closed");
			setAnswerResolution(null);
			setSendMessage(null);
			setOpenedEntryIndex(null);
			if (event.code !== 1000) {
				setError(event.reason || "Gameplay socket closed.");
			}
		});
		const unsubscribeError = socket.onError(() => {
			setConnectionState("error");
			setAnswerResolution(null);
			setOpenedEntryIndex(null);
			setError("Gameplay socket encountered an error.");
		});
		const unsubscribeMessage = socket.onMessage((result) => {
			if (!result.success) {
				setError("Backend sent an unexpected gameplay message.");
				return;
			}

			switch (result.data.type) {
				case "gameStateUpdate":
					setGameState(result.data.gameState);
					setError(null);
					break;
				case "turnResolved":
					setAnswerResolution(result.data);
					break;
				case "playersUpdate":
					if (result.data.playerId !== session.playerId) {
						showPlayerPresenceToast(result.data);
					}
					break;
				case "openedEntryUpdate":
					setOpenedEntryIndex(result.data.entryIndex);
					break;
				case "gameError":
					setError(result.data.message);
					break;
			}
		});

		setSendMessage(() => (message: GameplayClientMessage) => {
			try {
				socket.send(message);
				return true;
			} catch (error) {
				const message =
					error && typeof error === "object" && "message" in error
						? String(error.message)
						: "Could not send gameplay message.";
				setError(message);
				return false;
			}
		});
		setLeaveGameMessage(() => async () => {
			if (
				socket.readyState === WebSocket.CLOSING ||
				socket.readyState === WebSocket.CLOSED
			) {
				return;
			}

			if (socket.readyState === WebSocket.OPEN) {
				try {
					socket.send({
						type: "leaveGame",
					});
				} catch (error) {
					const message =
						error && typeof error === "object" && "message" in error
							? String(error.message)
							: "Could not send gameplay message.";
					setError(message);
				}
			}

			socket.close(1000, "Leaving gameplay route");
			await new Promise((resolve) => {
				window.setTimeout(resolve, 50);
			});
		});

		return () => {
			unsubscribeOpen();
			unsubscribeClose();
			unsubscribeError();
			unsubscribeMessage();
			setSendMessage(null);
			setLeaveGameMessage(null);
			if (
				socket.readyState !== WebSocket.CLOSING &&
				socket.readyState !== WebSocket.CLOSED
			) {
				socket.close(1000, "Leaving gameplay route");
			}
		};
	}, [api, normalizedGameCode, session.playerId, showPlayerPresenceToast]);

	const send = useCallback(
		(message: GameplayClientMessage) => sendMessage?.(message) ?? false,
		[sendMessage],
	);

	const closeAnswerPanel = useCallback(
		(clearOpenedEntry: boolean = false) => {
			setIsAnswerPanelOpen(false);
			setIsSubmittingAnswer(false);
			setAnswerPanelResult(null);
			setActiveAnswerEntryIndex(null);

			if (!clearOpenedEntry) {
				return;
			}

			send({
				type: "setOpenedEntry",
				entryIndex: null,
			});
		},
		[send],
	);

	const selectEntry = (itemId: string | null) => {
		if (itemId === null) {
			closeAnswerPanel(true);
			return;
		}

		if (!canAnswer || !currentCard) {
			return;
		}

		const nextOpenedEntryIndex = Number(itemId);
		const didSend = send({
			type: "setOpenedEntry",
			entryIndex: nextOpenedEntryIndex,
		});

		if (!didSend) {
			return;
		}

		setActiveAnswerEntryIndex(nextOpenedEntryIndex);
		setAnswerPanelResult(null);
		setIsSubmittingAnswer(false);
		setIsAnswerPanelOpen(true);
	};

	useEffect(() => {
		if (isSubmittingAnswer || answerPanelResult) {
			return;
		}

		if (previousCardKeyRef.current === selectedCardKey) {
			return;
		}

		previousCardKeyRef.current = selectedCardKey;
		closeAnswerPanel();
	}, [
		answerPanelResult,
		closeAnswerPanel,
		isSubmittingAnswer,
		selectedCardKey,
	]);

	useEffect(() => {
		if (openedEntryIndex !== null || isSubmittingAnswer || answerPanelResult) {
			return;
		}

		setActiveAnswerEntryIndex(null);
		setIsAnswerPanelOpen(false);
	}, [answerPanelResult, isSubmittingAnswer, openedEntryIndex]);

	useEffect(() => {
		if (!answerResolution) {
			return;
		}

		if (
			answerResolution.resolution === "submitted" &&
			answerResolution.playerId === playerId
		) {
			setIsSubmittingAnswer(false);
			setAnswerPanelResult({
				answer: answerResolution.answer,
				isCorrect: answerResolution.isCorrect,
			});
			setIsAnswerPanelOpen(true);

			const timeoutId = window.setTimeout(() => {
				closeAnswerPanel();
			}, answerResolutionDurationMs);

			return () => {
				window.clearTimeout(timeoutId);
			};
		}

		if (
			answerResolution.resolution === "timedOut" &&
			answerResolution.playerId === playerId
		) {
			closeAnswerPanel();
			return;
		}

		showAnswerResolutionToast(answerResolution);
	}, [answerResolution, closeAnswerPanel, playerId, showAnswerResolutionToast]);

	useEffect(() => {
		if (gameState?.isTurnPaused) {
			setRemainingTurnMs(gameState.turnRemainingMs);
			return;
		}

		if (!gameState?.turnExpiresAt) {
			setRemainingTurnMs(gameState?.turnRemainingMs ?? null);
			return;
		}

		const syncRemainingTurnMs = () => {
			const remaining =
				new Date(gameState.turnExpiresAt ?? Date.now()).getTime() - Date.now();
			setRemainingTurnMs(Math.max(0, remaining));
		};

		syncRemainingTurnMs();
		const intervalId = window.setInterval(syncRemainingTurnMs, 250);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [
		gameState?.isTurnPaused,
		gameState?.turnExpiresAt,
		gameState?.turnRemainingMs,
	]);

	const submitAnswer = (entryIndex: number, answer: string) => {
		if (!canAnswer) {
			return;
		}

		const didSend = send({
			type: "submitAnswer",
			entryIndex,
			answer,
		});

		if (didSend) {
			setIsSubmittingAnswer(true);
		}
	};

	const doneAnswering = () => {
		if (!canSend || !currentPlayer?.isPlayerTurn) {
			return;
		}

		const didSend = send({
			type: "doneAnswering",
		});

		if (didSend) {
			closeAnswerPanel();
		}
	};

	const toggleTurnPaused = () => {
		if (!canTogglePause) {
			return;
		}

		send({
			type: "setTurnPaused",
			paused: !gameState?.isTurnPaused,
		});
	};

	const leaveGameAndReturnToLobby = async () => {
		if (isLeavingGame) {
			return;
		}

		setIsLeavingGame(true);

		try {
			await leaveGameMessage?.();
			await clearGameSessionCookie();
			router.replace("/lobby");
		} finally {
			setIsLeavingGame(false);
		}
	};

	if (gameState?.gameState === "FINISHED") {
		return (
			<>
				<AnswerResolutionToast resolution={answerResolutionToast} />
				<PlayerPresenceToast message={playerPresenceToast} />
				<main className={styles.page}>
					<GameplayFinishedView
						isLeavingGame={isLeavingGame}
						onLeaveGame={() => {
							void leaveGameAndReturnToLobby();
						}}
					/>
				</main>
			</>
		);
	}

	return (
		<SidebarLayout
			mobileOpen={isSidebarOpen}
			onMobileOpenChange={setIsSidebarOpen}
			sidebar={
				<GameplaySidebar
					canTogglePause={canTogglePause}
					gameCode={session.gameCode}
					inviteHref={inviteHref}
					isLeavingGame={isLeavingGame}
					isTurnPaused={Boolean(gameState?.isTurnPaused)}
					onLeaveGame={() => {
						void leaveGameAndReturnToLobby();
					}}
					onTogglePause={toggleTurnPaused}
					players={gameState?.players ?? []}
				/>
			}
			title="Game details"
		>
			<AnswerResolutionToast resolution={answerResolutionToast} />
			<PlayerPresenceToast message={playerPresenceToast} />
			<main className={styles.page}>
				{error ? <p className={styles.errorMessage}>{error}</p> : null}

				{gameState?.gameState === "NOT_STARTED" ? (
					<GameplayNotStartedView
						allReady={allReady}
						canSend={canSend}
						currentPlayer={currentPlayer}
						onStartGame={() => {
							send({ type: "startGame" });
						}}
						onToggleReady={() => {
							if (!currentPlayer) {
								return;
							}

							send({
								type: "toggleReady",
								state: !currentPlayer.isReady,
							});
						}}
						playerId={playerId}
						players={gameState.players}
					/>
				) : null}

				{gameState?.gameState === "IN_PROGRESS" && currentCard ? (
					<GameplayInProgressView
						activeAnswerEntryIndex={activeAnswerEntryIndex}
						answerPanelResult={answerPanelResult}
						canAnswerSelectedEntry={canAnswerSelectedEntry}
						canSend={canSend}
						currentCard={currentCard}
						currentPlayer={currentPlayer}
						waitingForNextRoundReason={waitingForNextRoundReason}
						isAnswerPanelOpen={isAnswerPanelOpen}
						isSubmittingAnswer={isSubmittingAnswer}
						openedEntryIndex={openedEntryIndex}
						onDoneAnswering={doneAnswering}
						onSelectEntry={selectEntry}
						onSetAnswerPanelOpen={(open) => {
							if (open) {
								setIsAnswerPanelOpen(true);
								return;
							}

							closeAnswerPanel(true);
						}}
						onSubmitAnswer={submitAnswer}
						playerId={playerId}
						remainingTurnMs={
							gameState.isTurnPaused
								? gameState.turnRemainingMs
								: remainingTurnMs
						}
						round={gameState.round ?? 1}
						isTurnPaused={Boolean(gameState.isTurnPaused)}
						triviaItems={triviaItems}
						turnPlayer={turnPlayer}
						turnTimeoutEnabled={turnTimeoutEnabled}
					/>
				) : null}

				{!gameState ? (
					<div className={styles.notice}>
						<p>Connecting to the game session...</p>
					</div>
				) : null}
			</main>
		</SidebarLayout>
	);
}
