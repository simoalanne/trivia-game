"use client";

import type { GameplayState } from "@packages/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarLayout } from "@/components";
import { TriviaCard } from "@/components/TriviaCard";
import styles from "./ActiveGamePage.module.css";
import {
	AnswerPanel,
	type AnswerPanelAnswer,
	type AnswerPanelResult,
	AnswerResolutionToast,
	GameplaySidebar,
	useAnswerResolutionToast,
} from "./components";
import { useGameplaySocket } from "./useGameplaySocket";

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

export default function ActiveGamePage() {
	const { gameCode } = useParams<{ gameCode: string }>();
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
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { answerResolutionToast, showAnswerResolutionToast } =
		useAnswerResolutionToast(answerResolutionDurationMs);
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
	}, [answerResolution, playerId, showAnswerResolutionToast]);

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
		<SidebarLayout
			mobileOpen={isSidebarOpen}
			onMobileOpenChange={setIsSidebarOpen}
			sidebar={
				<GameplaySidebar
					canTogglePause={canTogglePause}
					gameCode={gameCode}
					isTurnPaused={Boolean(gameState?.isTurnPaused)}
					lobbyHref={`/play/${gameCodePath}/lobby`}
					onTogglePause={toggleTurnPaused}
					players={gameState?.players ?? []}
				/>
			}
			title="Game details"
		>
			<AnswerResolutionToast resolution={answerResolutionToast} />
			<main className={styles.page}>
				<header className="mx-auto flex w-full max-w-5xl justify-center">
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
							<TriviaCard
								items={triviaItems}
								onSelectedItemChange={selectEntry}
								prompt={currentCard.prompt}
								selectedItemId={
									openedEntryIndex !== null ? String(openedEntryIndex) : null
								}
								showSelectedStyling={!isAnswerPanelOpen}
							/>
						</section>

						<div className={styles.gameActions}>
							<button
								className="btn btn-sm"
								disabled={!canSend || !currentPlayer?.isPlayerTurn}
								onClick={doneAnswering}
								type="button"
							>
								Done answering
							</button>
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
		</SidebarLayout>
	);
}
