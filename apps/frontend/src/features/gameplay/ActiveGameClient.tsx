"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GameplayCurrentCard, GameplaySession } from "@packages/contracts";
import { Button, Select, TextInput } from "@/components";
import { useGameplaySocket } from "./useGameplaySocket";
import styles from "./ActiveGamePage.module.css";

type ActiveGameClientProps = {
	gameCode: string;
};

type SubmittedAnswer = string | boolean | number;

const formatAnswer = (answer: string | string[] | boolean | number) =>
	Array.isArray(answer) ? answer.join(", ") : String(answer);

const getEntryOptions = (
	card: GameplayCurrentCard,
	entryIndex: number,
): Array<{ label: string; value: string }> => {
	switch (card.format) {
		case "MULTIPLE_CHOICE":
			return (card.choices ?? []).map((choice) => ({
				label: choice,
				value: choice,
			}));
		case "TRUE_OR_FALSE":
			return [
				{ label: "True", value: "true" },
				{ label: "False", value: "false" },
			];
		case "ORDER_ITEMS": {
			const usedOrders = new Set(
				card.entries
					.filter((entry, index) => entry.state !== "unanswered" && index !== entryIndex)
					.map((entry) => String(entry.answer)),
			);
			return card.entries
				.map((_, index) => String(index + 1))
				.filter((order) => !usedOrders.has(order))
				.map((order) => ({
					label: order,
					value: order,
				}));
		}
		default:
			return [];
	}
};

const coerceAnswer = (
	card: GameplayCurrentCard,
	answer: string,
): SubmittedAnswer => {
	if (card.format === "TRUE_OR_FALSE") {
		return answer === "true";
	}

	if (card.format === "ORDER_ITEMS") {
		return Number(answer);
	}

	return answer.trim();
};

const getCurrentTurnPlayer = (gameState: GameplaySession | null) =>
	gameState?.players[gameState.playerTurnIndex] ?? null;

export default function ActiveGameClient({ gameCode }: ActiveGameClientProps) {
	const { connectionState, error, gameState, playerId, send } =
		useGameplaySocket(gameCode);
	const [answers, setAnswers] = useState<Record<number, string>>({});
	const [activeEntryIndex, setActiveEntryIndex] = useState<number | null>(null);
	const gameCodePath = gameCode.toLowerCase();
	const currentCard = gameState?.currentCard ?? null;
	const currentPlayer = gameState?.players.find((player) => player.id === playerId);
	const turnPlayer = getCurrentTurnPlayer(gameState);
	const isCurrentTurn = Boolean(turnPlayer && turnPlayer.id === playerId);
	const canSend = connectionState === "open" && Boolean(currentPlayer);

	const sortedPlayers = useMemo(
		() =>
			[...(gameState?.players ?? [])].sort(
				(first, second) =>
					(gameState?.scores[second.id] ?? 0) -
					(gameState?.scores[first.id] ?? 0),
			),
		[gameState],
	);

	const setAnswer = (entryIndex: number, value: string) => {
		setAnswers((current) => {
			const next = { ...current };
			if (value.trim()) {
				next[entryIndex] = value;
			} else {
				delete next[entryIndex];
			}
			return next;
		});
		setActiveEntryIndex(value.trim() ? entryIndex : null);
	};

	const submitAnswer = (entryIndex: number) => {
		if (!currentCard) {
			return;
		}

		const rawAnswer = answers[entryIndex]?.trim();
		if (!rawAnswer) {
			return;
		}

		const didSend = send({
			type: "submitAnswer",
			entryIndex,
			answer: coerceAnswer(currentCard, rawAnswer),
		});

		if (didSend) {
			setAnswers((current) => {
				const next = { ...current };
				delete next[entryIndex];
				return next;
			});
			setActiveEntryIndex(null);
		}
	};

	return (
		<main className={styles.page}>
			<section className={styles.panel} aria-labelledby="active-game-title">
				<div className={styles.header}>
					<p className={styles.kicker}>Game {gameCode.toUpperCase()}</p>
					<h1 id="active-game-title">
						{currentCard ? `Round ${gameState?.round ?? 1}` : "Gameplay"}
					</h1>
					<p>
						{turnPlayer
							? `${turnPlayer.name}'s turn`
							: connectionState === "open"
								? "Waiting for the first round"
								: "Connecting to gameplay"}
					</p>
				</div>

				<div className={styles.statusBar}>
					<span>{connectionState}</span>
					<span>{gameState?.gameState ?? "loading"}</span>
					<span>{currentPlayer ? `${currentPlayer.name} - you` : "joining"}</span>
				</div>

				{error ? <p className={styles.errorMessage}>{error}</p> : null}

				<aside className={styles.scoreboard} aria-label="Scoreboard">
					{sortedPlayers.map((player) => (
						<div
							className={`${styles.playerScore} ${
								player.id === playerId ? styles.currentPlayer : ""
							} ${player.id === turnPlayer?.id ? styles.currentTurn : ""}`}
							key={player.id}
						>
							<strong>{player.name}</strong>
							<span>{String(gameState?.scores[player.id] ?? 0).padStart(3, "0")}</span>
						</div>
					))}
				</aside>

				{gameState?.gameState === "waiting" ? (
					<div className={styles.notice}>
						<p>This game has not started yet.</p>
						<Link href={`/play/${gameCodePath}/lobby`}>Open lobby</Link>
					</div>
				) : null}

				{currentCard ? (
					<section className={styles.round} aria-label="Current trivia card">
						<h2>{currentCard.prompt}</h2>
						<div className={styles.entriesGrid}>
							{currentCard.entries.map((entry, entryIndex) => {
								const answered = entry.state !== "unanswered";
								const inputDisabled =
									!canSend ||
									!isCurrentTurn ||
									answered ||
									(activeEntryIndex !== null && activeEntryIndex !== entryIndex);
								const selectedAnswer = answers[entryIndex] ?? "";
								const options = getEntryOptions(currentCard, entryIndex);

								return (
									<article
										className={`${styles.entryCard} ${
											answered ? styles.answeredEntry : ""
										}`}
										key={`${entry.text}-${entryIndex}`}
									>
										<h3>{entry.text}</h3>

										{answered ? (
											<div className={styles.answerSummary}>
												<span>{formatAnswer(entry.answer)}</span>
												<strong
													className={
														entry.state === "correct"
															? styles.correctAnswer
															: styles.wrongAnswer
													}
												>
													{entry.state === "correct" ? "Correct" : "Wrong"}
												</strong>
												{entry.explanation ? <p>{entry.explanation}</p> : null}
											</div>
										) : currentCard.format === "OPEN_ENDED" ? (
											<TextInput
												disabled={inputDisabled}
												onChange={(event) =>
													setAnswer(entryIndex, event.target.value)
												}
												placeholder="Your answer"
												value={selectedAnswer}
											/>
										) : (
											<Select
												disabled={inputDisabled}
												onChange={(event) =>
													setAnswer(entryIndex, event.target.value)
												}
												value={selectedAnswer}
											>
												<option value="">Select answer</option>
												{options.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</Select>
										)}

										{!answered ? (
											<Button
												disabled={inputDisabled || !selectedAnswer.trim()}
												onClick={() => submitAnswer(entryIndex)}
												size="sm"
											>
												Submit answer
											</Button>
										) : null}
									</article>
								);
							})}
						</div>
					</section>
				) : null}
			</section>
		</main>
	);
}
