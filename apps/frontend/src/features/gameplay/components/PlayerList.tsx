export type PlayerListItem = {
	id: string;
	name: string;
	totalPoints: number;
	roundPoints: number;
};

type PlayerDisplayProps = {
	player: PlayerListItem;
};

type PlayerListProps = {
	players: PlayerListItem[];
};

export function PlayerList({ players }: PlayerListProps) {
	return (
		<div className="grid gap-4">
			{players.map((player) => (
				<PlayerDisplay key={player.id} player={player} />
			))}
		</div>
	);
}

export function PlayerDisplay({ player }: PlayerDisplayProps) {
	const initial = player.name.trim().charAt(0).toUpperCase() || "?";

	return (
		<article className="grid min-w-38 gap-2">
			<div className="flex items-center gap-3">
				<div className="avatar avatar-placeholder">
					<div className="w-10 rounded-full bg-neutral text-neutral-content">
						<span className="text-sm font-bold">{initial}</span>
					</div>
				</div>

				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">{player.name}</p>
				</div>
			</div>

			<div className="border-base-content/20 flex items-center gap-3 border-t pt-2 text-xs">
				<span>
					<span className="opacity-60">Total: </span>
					<strong className="font-mono text-sm">{player.totalPoints}</strong>
				</span>
				<span>
					<span className="opacity-60">Round: </span>
					<strong className="font-mono text-sm">{player.roundPoints}</strong>
				</span>
			</div>
		</article>
	);
}
