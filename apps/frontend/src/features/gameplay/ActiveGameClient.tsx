"use client";

import type { GameplayState, TurnResolvedMessage } from "@packages/contracts";
import { CheckIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components";
import { formatCountryDisplay } from "@/components/countryDisplay";
import { TriviaCard } from "@/components/TriviaCard";
import styles from "./ActiveGamePage.module.css";
import {
	AnswerPanel,
	type AnswerPanelAnswer,
	type AnswerPanelResult,
	GameCode,
	PlayerList,
	type PlayerPosition,
	type PlayerTone,
} from "./components";
import { useGameplaySocket } from "./useGameplaySocket";

type ActiveGameClientProps = {
	gameCode: string;
};

const playerPositions: PlayerPosition[] = [
	"topLeft",
	"topRight",
	"bottomLeft",
	"bottomRight",
];
const playerTones: PlayerTone[] = ["green", "red", "blue", "gold"];
const answerResolutionDurationMs = 1200;

type AnswerPanelConfig =
	| {
			kind: "choices";
			choices: string[];
	  }
	| {
			kind: "text";
			placeholder: string;
	  }
	| {
			kind: "country";
			placeholder: string;
	  };

type ActiveAnswerPanelState = {
	entryIndex: number;
	prompt: string;
	title: string;
	answerConfig: AnswerPanelConfig;
};

const getCurrentTurnPlayer = (gameState: GameplayState | null) =>
	gameState?.players.find((player) => player.isPlayerTurn) ?? null;

const normalizeResolvedAnswer = (
	turnResolution: Extract<TurnResolvedMessage, { resolution: "submitted" }>,
) => {
	if (turnResolution.uiHint !== "COUNTRY") {
		return {
			answer: turnResolution.answer,
			correctAnswer: turnResolution.correctAnswer,
		};
	}

	return {
		answer: formatCountryDisplay(turnResolution.answer),
		correctAnswer: formatCountryDisplay(turnResolution.correctAnswer),
	};
};

const createAnswerPanelState = (
	card: NonNullable<GameplayState["card"]>,
	entryIndex: number,
): ActiveAnswerPanelState => ({
	answerConfig: card.choices?.length
		? {
				kind: "choices",
				choices: card.choices,
			}
		: card.uiHint === "COUNTRY"
			? {
					kind: "country",
					placeholder: "Country",
				}
			: {
					kind: "text",
					placeholder: "Your answer",
				},
	entryIndex,
	prompt: card.prompt,
	title: card.entries[entryIndex]?.text ?? "",
});

const toAnswerPanelAnswer = (
	panelState: ActiveAnswerPanelState,
	onSubmit: (answer: string) => void,
): AnswerPanelAnswer => {
	switch (panelState.answerConfig.kind) {
		case "choices":
			return {
				kind: "choices",
				choices: panelState.answerConfig.choices,
				onSubmit,
			};
		case "country":
			return {
				kind: "country",
				placeholder: panelState.answerConfig.placeholder,
				onSubmit,
			};
		case "text":
			return {
				kind: "text",
				placeholder: panelState.answerConfig.placeholder,
				onSubmit,
			};
	}
};

export default function ActiveGameClient({ gameCode }: ActiveGameClientProps) {
	const {
		answerResolution,
		connectionState,
		error,
		gameState,
		openedEntryIndex,
		playerId,
		send,
	} = useGameplaySocket(gameCode);
	const [activeAnswerPanel, setActiveAnswerPanel] =
		useState<ActiveAnswerPanelState | null>(null);
	const [isAnswerPanelOpen, setIsAnswerPanelOpen] = useState(false);
	const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
	const [answerPanelResult, setAnswerPanelResult] =
		useState<AnswerPanelResult | null>(null);
	const [spectatorResolution, setSpectatorResolution] =
		useState<TurnResolvedMessage | null>(null);
	const [remainingTurnMs, setRemainingTurnMs] = useState<number | null>(null);
	const gameCodePath = gameCode.toLowerCase();
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
	const turnTimeoutEnabled = (gameState?.turnDurationSeconds ?? 0) > 0;
	const canTogglePause =
		connectionState === "open" &&
		Boolean(currentPlayer?.isHost) &&
		gameState?.gameState === "IN_PROGRESS" &&
		turnTimeoutEnabled;

	const playerList = (gameState?.players ?? []).map((player, index) => ({
		id: player.id,
		name: player.name,
		score: player.totalPoints + player.roundPoints,
		tone: playerTones[index % playerTones.length] ?? "blue",
		position: playerPositions[index % playerPositions.length] ?? "bottomLeft",
		isYou: player.id === playerId,
		isCurrentTurn: player.id === turnPlayer?.id,
		statusLabel: !player.isParticipatingInCurrentRound ? "Done" : undefined,
	}));

	const triviaItems =
		currentCard?.entries.map((entry, entryIndex) => ({
			id: String(entryIndex),
			label: entry.text,
			answer: entry.answer ?? undefined,
			answerUiHint:
				currentCard.uiHint === "COUNTRY" ? ("country" as const) : undefined,
			disabled: entry.answer !== null || !canAnswer,
			highlightColor: "blue",
		})) ?? [];

	const selectedEntry =
		activeAnswerPanel && currentCard
			? (currentCard.entries[activeAnswerPanel.entryIndex] ?? null)
			: null;
	const canAnswerSelectedEntry = Boolean(
		activeAnswerPanel &&
			selectedEntry &&
			selectedEntry.answer === null &&
			canAnswer &&
			!isSubmittingAnswer &&
			!answerPanelResult,
	);
	const selectedCardKey = `${gameState?.round ?? 0}:${currentCard?.prompt ?? ""}`;

	const closeAnswerPanel = (clearOpenedEntry: boolean = false) => {
		setIsAnswerPanelOpen(false);
		setIsSubmittingAnswer(false);
		setAnswerPanelResult(null);
		setActiveAnswerPanel(null);

		if (!clearOpenedEntry) {
			return;
		}

		send({
			type: "setOpenedEntry",
			entryIndex: null,
		});
	};

	const selectEntry = (itemId: string | null) => {
		if (itemId === null) {
			closeAnswerPanel(true);
			return;
		}

		if (!canAnswer) {
			return;
		}

		if (!currentCard) {
			return;
		}

		const nextOpenedEntryIndex = Number(itemId);
		const nextAnswerPanelState = createAnswerPanelState(
			currentCard,
			nextOpenedEntryIndex,
		);
		const didSend = send({
			type: "setOpenedEntry",
			entryIndex: nextOpenedEntryIndex,
		});

		if (!didSend) {
			return;
		}

		setActiveAnswerPanel(nextAnswerPanelState);
		setAnswerPanelResult(null);
		setIsSubmittingAnswer(false);
		setIsAnswerPanelOpen(true);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset selected entry when the backend advances the card.
	useEffect(() => {
		if (isSubmittingAnswer || answerPanelResult) {
			return;
		}

		closeAnswerPanel();
	}, [answerPanelResult, isSubmittingAnswer, selectedCardKey]);

	useEffect(() => {
		if (openedEntryIndex !== null || isSubmittingAnswer || answerPanelResult) {
			return;
		}

		setActiveAnswerPanel(null);
		setIsAnswerPanelOpen(false);
	}, [answerPanelResult, isSubmittingAnswer, openedEntryIndex]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we don't care if answerpanelstate changes...
	useEffect(() => {
		if (!answerResolution) {
			return;
		}

		if (
			answerResolution.resolution === "submitted" &&
			answerResolution.playerId === playerId
		) {
			setSpectatorResolution(null);
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
		}

		setSpectatorResolution(answerResolution);
		const timeoutId = window.setTimeout(() => {
			setSpectatorResolution(null);
		}, answerResolutionDurationMs);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [answerResolution, playerId]);

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
				new Date(gameState.turnExpiresAt!).getTime() - Date.now();
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

	return (
		<main className={styles.page}>
			<header className={styles.topBar}>
				<GameCode code={gameCode} />
				<div className={styles.roundStatus}>
					<strong>
						{currentCard ? `Round ${gameState?.round ?? 1}` : "Gameplay"}
					</strong>
					{turnPlayer ? (
						<span>
							{turnPlayer.id === playerId
								? "Your turn"
								: `${turnPlayer.name}'s turn`}
						</span>
					) : null}
					{turnTimeoutEnabled ? (
						<span className={styles.turnTimer}>
							{gameState?.isTurnPaused
								? `Paused at ${Math.ceil((remainingTurnMs ?? 0) / 1000)}s`
								: `${Math.ceil((remainingTurnMs ?? 0) / 1000)}s left`}
						</span>
					) : null}
				</div>
			</header>

			{error ? <p className={styles.errorMessage}>{error}</p> : null}

			{gameState?.gameState === "NOT_STARTED" ? (
				<div className={styles.notice}>
					<p>This game has not started yet.</p>
					<Link href={`/play/${gameCodePath}/lobby`}>Open lobby</Link>
				</div>
			) : null}

			{currentCard && (
				<>
					<section className={styles.stage} aria-label="Current trivia card">
						<PlayerList players={playerList} />

						<TriviaCard
							items={triviaItems}
							onSelectedItemChange={selectEntry}
							prompt={currentCard.prompt}
							selectedItemId={
								openedEntryIndex !== null ? String(openedEntryIndex) : null
							}
							showSelectedStyling={!isAnswerPanelOpen}
						/>

						{spectatorResolution
							? (() => {
									const normalizedResolution =
										spectatorResolution.resolution === "submitted"
											? normalizeResolvedAnswer(spectatorResolution)
											: null;

									return (
										<div
											className={`${styles.answerResolutionOverlay} ${
												spectatorResolution.resolution === "submitted" &&
												spectatorResolution.isCorrect
													? styles.answerResolutionOverlayCorrect
													: styles.answerResolutionOverlayWrong
											}`}
										>
											<p className={styles.answerResolutionPrompt}>
												{spectatorResolution.resolution === "submitted"
													? spectatorResolution.prompt
													: `${spectatorResolution.playerName}'s turn ended`}
											</p>
											<p className={styles.answerResolutionLine}>
												<strong>{spectatorResolution.playerName}</strong>
												{spectatorResolution.resolution === "submitted" ? (
													<>
														<span> answered: </span>
														<strong>{normalizedResolution?.answer}</strong>
													</>
												) : (
													<span> ran out of time</span>
												)}
											</p>
											<div className={styles.answerResolutionBadge}>
												{spectatorResolution.resolution === "submitted" &&
												spectatorResolution.isCorrect ? (
													<CheckIcon aria-hidden="true" size={26} />
												) : (
													<XIcon aria-hidden="true" size={26} />
												)}
												<span>
													{spectatorResolution.resolution === "submitted"
														? spectatorResolution.isCorrect
															? "Correct"
															: "Wrong"
														: "Timed out"}
												</span>
											</div>
											{spectatorResolution.resolution === "submitted" &&
											!spectatorResolution.isCorrect ? (
												<p className={styles.answerResolutionCorrectAnswer}>
													<span>Correct answer:</span>{" "}
													<strong>{normalizedResolution?.correctAnswer}</strong>
												</p>
											) : null}
										</div>
									);
								})()
							: null}
					</section>

					<div className={styles.gameActions}>
						{canTogglePause ? (
							<Button onClick={toggleTurnPaused} size="sm" variant="secondary">
								{gameState?.isTurnPaused ? "Resume timer" : "Pause timer"}
							</Button>
						) : null}
						<Button
							disabled={!canSend || !currentPlayer?.isPlayerTurn}
							onClick={doneAnswering}
							size="sm"
							variant="secondary"
						>
							Done answering
						</Button>
					</div>

					<AnswerPanel
						answer={
							activeAnswerPanel
								? toAnswerPanelAnswer(activeAnswerPanel, (answer) =>
										submitAnswer(activeAnswerPanel.entryIndex, answer),
									)
								: null
						}
						result={answerPanelResult}
						disabled={!canAnswerSelectedEntry}
						open={isAnswerPanelOpen}
						prompt={activeAnswerPanel?.prompt}
						setOpen={(open) => {
							if (open) {
								setIsAnswerPanelOpen(true);
								return;
							}

							closeAnswerPanel(true);
						}}
						submitting={isSubmittingAnswer}
						title={activeAnswerPanel?.title}
					/>
				</>
			)}

			{gameState?.gameState === "FINISHED" ? (
				<div className={styles.notice}>
					<p>The game is finished.</p>
					<Link href={`/play/${gameCodePath}/lobby`}>Back to lobby</Link>
				</div>
			) : null}
		</main>
	);
}
