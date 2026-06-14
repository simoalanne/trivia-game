"use client";

import type { QuestionCard } from "@packages/contracts";
import { useEffect, useMemo, useState } from "react";
import {
	AnswerPanel,
	type AnswerPanelAnswer,
	GameCode,
	PlayerList,
	type PlayerListItem,
	TriviaCard,
	type TriviaCardItem,
} from "@/features/gameplay/components";
import { useApiClient } from "@/lib/apiClientProvider";
import styles from "./GameCardMock.module.css";

const players: PlayerListItem[] = [
	{ id: "p1", name: "John", score: 0, tone: "blue", position: "bottomLeft" },
	{ id: "p2", name: "Henry", score: 0, tone: "red", position: "topRight" },
	{
		id: "p3",
		name: "Alice",
		score: 0,
		tone: "green",
		position: "topLeft",
		isYou: true,
	},
	{ id: "p4", name: "Frank", score: 0, tone: "gold", position: "bottomRight" },
];

function pickRandomQuestion(questions: QuestionCard[]) {
	if (questions.length === 0) {
		return null;
	}

	return questions[Math.floor(Math.random() * questions.length)] ?? null;
}

function formatAnswerForCard(
	card: QuestionCard,
	answer: QuestionCard["entries"][number]["answer"],
) {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return answer ? "True" : "False";
		case "OPEN_ENDED":
			return Array.isArray(answer) ? answer.join(" / ") : String(answer);
		case "ORDER_ITEMS":
			return `#${answer}`;
		case "MULTIPLE_CHOICE":
			return String(answer);
	}
}

function toTriviaCardItems(card: QuestionCard): TriviaCardItem[] {
	return card.entries.map((entry, index) => ({
		id: `${card.id}-${index}`,
		label: entry.text,
		answer: formatAnswerForCard(card, entry.answer),
	}));
}

function toAnswerPanelAnswer(
	card: QuestionCard,
	onSubmit: () => void,
): AnswerPanelAnswer {
	switch (card.format) {
		case "TRUE_OR_FALSE":
			return {
				format: card.format,
				onSubmit,
			};
		case "MULTIPLE_CHOICE":
			return {
				format: card.format,
				choices: card.choices,
				onSubmit,
			};
		case "ORDER_ITEMS":
			return {
				format: card.format,
				positions: Array.from(
					{ length: card.entries.length },
					(_, index) => index + 1,
				),
				onSubmit,
			};
		case "OPEN_ENDED":
			return {
				format: card.format,
				placeholder: card.uiHint === "country" ? "Country" : "Your answer",
				uiHint: card.uiHint,
				onSubmit,
			};
	}
}

export default function GameCardMock() {
	const api = useApiClient();
	const questions = api.questionsCrud.list.useQuery();
	const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
	const selectedCard =
		questions.data?.find((question) => question.id === selectedCardId) ?? null;
	const items = useMemo(
		() => (selectedCard ? toTriviaCardItems(selectedCard) : []),
		[selectedCard],
	);
	const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
	const clearSelection = () => setSelectedItemId(null);

	useEffect(() => {
		if (!questions.data?.length) {
			return;
		}

		const selectedCardStillExists = questions.data.some(
			(question) => question.id === selectedCardId,
		);
		if (selectedCardStillExists) {
			return;
		}

		setSelectedCardId(pickRandomQuestion(questions.data)?.id ?? null);
		setSelectedItemId(null);
	}, [questions.data, selectedCardId]);

	return (
		<main className={styles.screen}>
			<header className={styles.topBar}>
				<GameCode code="PSRRM" />

				<div className={styles.roundStatus}>
					<strong>Round 1</strong>
				</div>
			</header>

			{questions.isLoading ? (
				<p className={styles.statusMessage}>Loading question cards...</p>
			) : null}

			{questions.error ? (
				<p className={styles.errorMessage}>{questions.error.message}</p>
			) : null}

			{!questions.isLoading && !questions.error && !selectedCard ? (
				<p className={styles.statusMessage}>No question cards found.</p>
			) : null}

			{selectedCard ? (
				<section className={styles.stage} aria-label="Gameplay mock">
					<PlayerList players={players} />

					<TriviaCard
						items={items}
						onSelectedItemChange={setSelectedItemId}
						prompt={selectedCard.prompt}
						selectedItemId={selectedItemId}
					/>
				</section>
			) : null}

			{selectedCard && selectedItem ? (
				<AnswerPanel
					answer={toAnswerPanelAnswer(selectedCard, clearSelection)}
					onSkip={clearSelection}
					prompt={selectedCard.prompt}
					title={selectedItem.label}
				/>
			) : null}
		</main>
	);
}
