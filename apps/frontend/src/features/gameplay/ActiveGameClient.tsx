"use client";

import type { GameplayCurrentCard, GameplaySession } from "@packages/contracts";
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

type SubmittedAnswer = string | boolean | number;

const playerPositions: PlayerPosition[] = [
	"topLeft",
	"topRight",
	"bottomLeft",
	"bottomRight",
];
const playerTones: PlayerTone[] = ["green", "red", "blue", "gold"];

const getBrowserLocales = () => {
	if (typeof navigator === "undefined") {
		return ["en"];
	}

	return navigator.languages.length > 0 ? navigator.languages : ["en"];
};

const getFlagEmoji = (countryCode: string) => {
	const normalizedCode = countryCode.trim().toUpperCase();
	if (!/^[A-Z]{2}$/.test(normalizedCode)) {
		return "";
	}

	return Array.from(normalizedCode)
		.map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
		.join("");
};

const formatAnswerValue = (
	value: string,
	uiHint: GameplayCurrentCard["uiHint"],
	displayNames: Intl.DisplayNames,
) => {
	if (uiHint !== "country") {
		return value;
	}

	const normalizedCode = value.toUpperCase();
	const label = displayNames.of(normalizedCode) ?? normalizedCode;
	const flagEmoji = getFlagEmoji(normalizedCode);
	return `${flagEmoji ? `${flagEmoji} ` : ""}${label}`;
};

const formatAnswer = (
	answer: string | string[] | boolean | number,
	uiHint: GameplayCurrentCard["uiHint"],
	displayNames: Intl.DisplayNames,
) =>
	Array.isArray(answer)
		? answer
				.map((value) => formatAnswerValue(value, uiHint, displayNames))
				.join(", ")
		: typeof answer === "string"
			? formatAnswerValue(answer, uiHint, displayNames)
			: String(answer);

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
					.filter(
						(entry, index) =>
							entry.state !== "unanswered" && index !== entryIndex,
					)
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

const getCurrentTurnPlayer = (gameState: GameplaySession | null) =>
	gameState?.players[gameState.playerTurnIndex] ?? null;

const getTriviaItemAnswer = (
	card: GameplayCurrentCard,
	entry: GameplayCurrentCard["entries"][number],
	displayNames: Intl.DisplayNames,
) =>
	entry.state === "unanswered"
		? undefined
		: formatAnswer(entry.answer, card.uiHint, displayNames);

const toAnswerPanelAnswer = (
	card: GameplayCurrentCard,
	entryIndex: number,
	onSubmit: (answer: SubmittedAnswer) => void,
): AnswerPanelAnswer => {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				format: card.format,
				onSubmit: (answer) => onSubmit(answer),
			};
		case "MULTIPLE_CHOICE":
			return {
				format: card.format,
				choices: card.choices ?? [],
				onSubmit: (answer) => onSubmit(answer),
			};
		case "ORDER_ITEMS":
			return {
				format: card.format,
				positions: getEntryOptions(card, entryIndex).map((option) =>
					Number(option.value),
				),
				onSubmit: (answer) => onSubmit(answer),
			};
		case "OPEN_ENDED":
			return {
				format: card.format,
				placeholder: card.uiHint === "country" ? "Country" : "Your answer",
				uiHint: card.uiHint,
				onSubmit: (answer) => onSubmit(answer),
			};
	}
};

export default function ActiveGameClient({ gameCode }: ActiveGameClientProps) {
	const { connectionState, error, gameState, playerId, send } =
		useGameplaySocket(gameCode);
	const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(
		null,
	);
	const gameCodePath = gameCode.toLowerCase();
	const currentCard = gameState?.currentCard ?? null;
	const currentPlayer = gameState?.players.find(
		(player) => player.id === playerId,
	);
	const turnPlayer = getCurrentTurnPlayer(gameState);
	const isCurrentTurn = Boolean(turnPlayer && turnPlayer.id === playerId);
	const hasBankedRoundPoints = Boolean(currentPlayer?.hasBankedRoundPoints);
	const currentRoundPoints = currentPlayer
		? (gameState?.roundScores[currentPlayer.id] ?? 0)
		: 0;
	const canSend = connectionState === "open" && Boolean(currentPlayer);
	const locales = getBrowserLocales();
	const displayNames = useMemo(
		() => new Intl.DisplayNames(locales, { type: "region" }),
		[locales],
	);

	const playerList = useMemo<PlayerListItem[]>(
		() =>
			(gameState?.players ?? []).map((player, index) => ({
				id: player.id,
				name: player.name,
				score:
					(gameState?.scores[player.id] ?? 0) +
					(gameState?.roundScores[player.id] ?? 0),
				tone: playerTones[index % playerTones.length] ?? "blue",
				position:
					playerPositions[index % playerPositions.length] ?? "bottomLeft",
				isYou: player.id === playerId,
				isCurrentTurn: player.id === turnPlayer?.id,
				hasBankedRoundPoints: player.hasBankedRoundPoints,
			})),
		[gameState, playerId, turnPlayer?.id],
	);

	const triviaItems = useMemo<TriviaCardItem[]>(
		() =>
			currentCard?.entries.map((entry, entryIndex) => ({
				id: String(entryIndex),
				label: entry.text,
				answer: getTriviaItemAnswer(currentCard, entry, displayNames),
				disabled:
					entry.state !== "unanswered" ||
					!canSend ||
					!isCurrentTurn ||
					hasBankedRoundPoints,
			})) ?? [],
		[currentCard, displayNames, canSend, isCurrentTurn, hasBankedRoundPoints],
	);

	const selectedEntry =
		selectedEntryIndex === null
			? null
			: (currentCard?.entries[selectedEntryIndex] ?? null);
	const canAnswerSelectedEntry = Boolean(
		currentCard &&
			selectedEntry &&
			selectedEntry.state === "unanswered" &&
			canSend &&
			isCurrentTurn &&
			!hasBankedRoundPoints,
	);

	const selectedCardId = currentCard?.id ?? null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset selected entry when the current card changes.
	useEffect(() => {
		setSelectedEntryIndex(null);
	}, [selectedCardId]);

	const submitAnswer = (entryIndex: number, answer: SubmittedAnswer) => {
		if (!currentCard || !canSend || !isCurrentTurn || hasBankedRoundPoints) {
			return;
		}

		const didSend = send({
			type: "submitAnswer",
			entryIndex,
			answer,
		});

		if (didSend) {
			setSelectedEntryIndex(null);
		}
	};

	const bankPoints = () => {
		if (!isCurrentTurn || !canSend) {
			return;
		}

		const didSend = send({
			type: "bankPoints",
		});

		if (didSend) {
			setSelectedEntryIndex(null);
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

			{gameState?.gameState === "waiting" ? (
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
							onSelectedItemChange={(itemId) =>
								setSelectedEntryIndex(itemId === null ? null : Number(itemId))
							}
							prompt={currentCard.prompt}
							selectedItemId={
								selectedEntryIndex === null ? null : String(selectedEntryIndex)
							}
						/>
					</section>

					<div className={styles.gameActions}>
						<Button
							disabled={!canSend || !isCurrentTurn || hasBankedRoundPoints}
							onClick={bankPoints}
							size="sm"
							variant="secondary"
						>
							{currentRoundPoints > 0 ? "Skip and bank points" : "Skip"}
						</Button>
					</div>

					{selectedEntryIndex !== null && selectedEntry ? (
						<AnswerPanel
							answer={toAnswerPanelAnswer(
								currentCard,
								selectedEntryIndex,
								(answer) => submitAnswer(selectedEntryIndex, answer),
							)}
							disabled={!canAnswerSelectedEntry}
							onSkip={bankPoints}
							prompt={currentCard.prompt}
							title={selectedEntry.text}
						/>
					) : null}
				</>
			) : null}
		</main>
	);
}
