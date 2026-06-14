import styles from "./PlayerList.module.css";

export type PlayerTone = "blue" | "red" | "green" | "gold";
export type PlayerPosition =
	| "topLeft"
	| "topRight"
	| "bottomLeft"
	| "bottomRight";

export type PlayerListItem = {
	id: string;
	name: string;
	score: number;
	tone: PlayerTone;
	position: PlayerPosition;
	isYou?: boolean;
	isCurrentTurn?: boolean;
	hasBankedRoundPoints?: boolean;
};

type PlayerCardProps = {
	player: PlayerListItem;
};

type PlayerListProps = {
	players: PlayerListItem[];
};

const cx = (...classNames: Array<string | false | undefined>) =>
	classNames.filter(Boolean).join(" ");

export function PlayerList({ players }: PlayerListProps) {
	return (
		<div className={styles.players}>
			{players.map((player) => (
				<PlayerCard key={player.id} player={player} />
			))}
		</div>
	);
}

export function PlayerCard({ player }: PlayerCardProps) {
	return (
		<div
			className={cx(
				styles.player,
				styles[player.position],
				styles[player.tone],
				player.isYou && styles.isYou,
				player.isCurrentTurn && styles.isCurrentTurn,
			)}
		>
			<span className={styles.playerName}>
				{player.isYou ? "You" : player.name}
			</span>
			<div className={styles.playerScoreLine}>
				<strong>{player.score.toString().padStart(3, "0")}</strong>
				{player.hasBankedRoundPoints ? (
					<span className={styles.playerStatus}>Skipped</span>
				) : null}
			</div>
		</div>
	);
}
