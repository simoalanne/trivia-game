"use client";

import type { GameplayState } from "@packages/contracts";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components";
import styles from "./ActiveGamePage.module.css";
import {
	AnswerPanel,
	type AnswerPanelAnswer,
	GameCode,
	PlayerList,
	type PlayerListItem,
	type PlayerPosition,
	type PlayerTone,
	TriviaCard,
	type TriviaCardItem,
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

const getCurrentTurnPlayer = (gameState: GameplayState | null) =>
	gameState?.players.find((player) => player.isPlayerTurn) ?? null;

const toAnswerPanelAnswer = (
	card: NonNullable<GameplayState["card"]>,
	onSubmit: (answer: string) => void,
): AnswerPanelAnswer =>
	card.choices?.length
		? {
				kind: "choices",
				choices: card.choices,
				onSubmit,
			}
		: card.uiHint === "COUNTRY"
			? {
					kind: "country",
					placeholder: "Country",
					onSubmit,
				}
			: {
					kind: "text",
					placeholder: "Your answer",
					onSubmit,
				};

export default function ActiveGameClient({ gameCode }: ActiveGameClientProps) {
	const { connectionState, error, gameState, playerId, send } =
		useGameplaySocket(gameCode);
	const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(
		null,
	);
	const [isAnswerPanelOpen, setIsAnswerPanelOpen] = useState(false);
	const gameCodePath = gameCode.toLowerCase();
	const currentCard = gameState?.card ?? null;
	const currentPlayer =
		gameState?.players.find((player) => player.id === playerId) ?? null;
	const turnPlayer = getCurrentTurnPlayer(gameState);
	const canSend = connectionState === "open" && Boolean(currentPlayer);
	const canAnswer =
		canSend &&
		Boolean(currentPlayer?.isPlayerTurn) &&
		Boolean(currentPlayer?.isParticipatingInCurrentRound);

	const playerList = useMemo<PlayerListItem[]>(
		() =>
			(gameState?.players ?? []).map((player, index) => ({
				id: player.id,
				name: player.name,
				score: player.totalPoints + player.roundPoints,
				tone: playerTones[index % playerTones.length] ?? "blue",
				position:
					playerPositions[index % playerPositions.length] ?? "bottomLeft",
				isYou: player.id === playerId,
				isCurrentTurn: player.id === turnPlayer?.id,
				statusLabel: !player.isParticipatingInCurrentRound ? "Done" : undefined,
			})),
		[gameState?.players, playerId, turnPlayer?.id],
	);

	const triviaItems = useMemo<TriviaCardItem[]>(
		() =>
			currentCard?.entries.map((entry, entryIndex) => ({
				id: String(entryIndex),
				label: entry.text,
				answer: entry.answer ?? undefined,
				disabled: entry.answer !== null || !canAnswer,
			})) ?? [],
		[currentCard, canAnswer],
	);

	const selectedEntry =
		selectedEntryIndex === null
			? null
			: (currentCard?.entries[selectedEntryIndex] ?? null);
	const canAnswerSelectedEntry = Boolean(
		selectedEntry && selectedEntry.answer === null && canAnswer,
	);
	const selectedCardKey = `${gameState?.round ?? 0}:${currentCard?.prompt ?? ""}`;

	const closeAnswerPanel = () => {
		setIsAnswerPanelOpen(false);
		setSelectedEntryIndex(null);
	};

	const selectEntry = (itemId: string | null) => {
		if (itemId === null) {
			closeAnswerPanel();
			return;
		}

		if (!canAnswer) {
			return;
		}

		setSelectedEntryIndex(Number(itemId));
		setIsAnswerPanelOpen(true);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset selected entry when the backend advances the card.
	useEffect(() => {
		closeAnswerPanel();
	}, [selectedCardKey]);

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
			closeAnswerPanel();
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
				</div>
			</header>

			{error ? <p className={styles.errorMessage}>{error}</p> : null}

			{gameState?.gameState === "NOT_STARTED" ? (
				<div className={styles.notice}>
					<p>This game has not started yet.</p>
					<Link href={`/play/${gameCodePath}/lobby`}>Open lobby</Link>
				</div>
			) : null}

			{currentCard ? (
				<>
					<section className={styles.stage} aria-label="Current trivia card">
						<PlayerList players={playerList} />

						<TriviaCard
							items={triviaItems}
							onSelectedItemChange={selectEntry}
							prompt={currentCard.prompt}
							selectedItemId={
								isAnswerPanelOpen && selectedEntryIndex !== null
									? String(selectedEntryIndex)
									: null
							}
						/>
					</section>

					<div className={styles.gameActions}>
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
							selectedEntryIndex !== null && selectedEntry
								? toAnswerPanelAnswer(currentCard, (answer) =>
										submitAnswer(selectedEntryIndex, answer),
									)
								: null
						}
						disabled={!canAnswerSelectedEntry}
						open={isAnswerPanelOpen}
						prompt={currentCard.prompt}
						setOpen={(open) => {
							if (open) {
								setIsAnswerPanelOpen(true);
								return;
							}

							closeAnswerPanel();
						}}
						title={selectedEntry?.text}
					/>
				</>
			) : null}

			{gameState?.gameState === "FINISHED" ? (
				<div className={styles.notice}>
					<p>The game is finished.</p>
					<Link href={`/play/${gameCodePath}/lobby`}>Back to lobby</Link>
				</div>
			) : null}
		</main>
	);
}
