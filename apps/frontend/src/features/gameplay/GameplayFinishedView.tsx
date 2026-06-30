import styles from "./ConnectedGameplay.module.css";

type GameplayFinishedViewProps = {
	isLeavingGame: boolean;
	onLeaveGame: () => void;
};

export default function GameplayFinishedView({
	isLeavingGame,
	onLeaveGame,
}: GameplayFinishedViewProps) {
	return (
		<div className={styles.notice}>
			<p>The game is finished.</p>
			<button
				className="btn btn-ghost"
				disabled={isLeavingGame}
				onClick={onLeaveGame}
				type="button"
			>
				Back to lobby
			</button>
		</div>
	);
}
