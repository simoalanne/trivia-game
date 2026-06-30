"use client";

import type { GameplayState } from "@packages/contracts";
import type { ComponentProps } from "react";
import { TriviaCard } from "@/components/TriviaCard";
import { AnswerPanel, type AnswerPanelResult } from "./AnswerPanel";
import styles from "./ConnectedGameplay.module.css";

type TriviaCardItems = ComponentProps<typeof TriviaCard>["items"];

type GameplayInProgressViewProps = {
	activeAnswerEntryIndex: number | null;
	answerPanelResult: AnswerPanelResult | null;
	canAnswerSelectedEntry: boolean;
	canSend: boolean;
	currentCard: NonNullable<GameplayState["card"]>;
	currentPlayer: GameplayState["players"][number] | null;
	isAnswerPanelOpen: boolean;
	isTurnPaused: boolean;
	isSubmittingAnswer: boolean;
	openedEntryIndex: number | null;
	onDoneAnswering: () => void;
	onSelectEntry: (itemId: string | null) => void;
	onSetAnswerPanelOpen: (open: boolean) => void;
	onSubmitAnswer: (entryIndex: number, answer: string) => void;
	playerId: string | null;
	remainingTurnMs: number | null;
	round: number;
	triviaItems: TriviaCardItems;
	turnPlayer: GameplayState["players"][number] | null;
	turnTimeoutEnabled: boolean;
};

export default function GameplayInProgressView({
	activeAnswerEntryIndex,
	answerPanelResult,
	canAnswerSelectedEntry,
	canSend,
	currentCard,
	currentPlayer,
	isAnswerPanelOpen,
	isTurnPaused,
	isSubmittingAnswer,
	openedEntryIndex,
	onDoneAnswering,
	onSelectEntry,
	onSetAnswerPanelOpen,
	onSubmitAnswer,
	playerId,
	remainingTurnMs,
	round,
	triviaItems,
	turnPlayer,
	turnTimeoutEnabled,
}: GameplayInProgressViewProps) {
	return (
		<>
			<header className="mx-auto flex w-full max-w-5xl justify-center">
				<div className={styles.roundStatus}>
					<strong>{`Round ${round}`}</strong>
					{turnPlayer ? (
						<span>
							{turnPlayer.id === playerId
								? "Your turn"
								: `${turnPlayer.name}'s turn`}
						</span>
					) : null}
					{turnTimeoutEnabled ? (
						<span className={styles.turnTimer}>
							{isTurnPaused
								? `Paused at ${Math.ceil((remainingTurnMs ?? 0) / 1000)}s`
								: `${Math.ceil((remainingTurnMs ?? 0) / 1000)}s left`}
						</span>
					) : null}
				</div>
			</header>

			<section className={styles.stage} aria-label="Current trivia card">
				<TriviaCard
					items={triviaItems}
					onSelectedItemChange={onSelectEntry}
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
					onClick={onDoneAnswering}
					type="button"
				>
					Done answering
				</button>
			</div>

			<AnswerPanel
				card={currentCard}
				entryIndex={activeAnswerEntryIndex}
				result={answerPanelResult}
				disabled={!canAnswerSelectedEntry}
				open={isAnswerPanelOpen}
				onSubmit={onSubmitAnswer}
				setOpen={onSetAnswerPanelOpen}
				submitting={isSubmittingAnswer}
			/>
		</>
	);
}
