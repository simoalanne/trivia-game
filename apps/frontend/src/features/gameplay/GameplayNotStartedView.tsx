import type { GameplayState } from "@packages/contracts";

type GameplayNotStartedViewProps = {
	allReady: boolean;
	canSend: boolean;
	onStartGame: () => void;
	onToggleReady: () => void;
	playerId: string | null;
	players: GameplayState["players"];
	currentPlayer: GameplayState["players"][number] | null;
};

export default function GameplayNotStartedView({
	allReady,
	canSend,
	onStartGame,
	onToggleReady,
	playerId,
	players,
	currentPlayer,
}: GameplayNotStartedViewProps) {
	return (
		<section
			className="mx-auto grid max-w-4xl gap-6 pt-8"
			aria-labelledby="gameplay-lobby-title"
		>
			<div>
				<p className="mb-2 font-bold text-primary">Lobby</p>
				<h1
					id="gameplay-lobby-title"
					className="text-5xl leading-none font-bold"
				>
					Waiting for players
				</h1>
			</div>

			<ul className="list gap-2" aria-label="Players in lobby">
				{players.map((player) => (
					<li
						className={`list-row border border-base-300 bg-base-100 ${
							player.id === playerId ? "border-primary" : ""
						}`}
						key={player.id}
					>
						<div className="grid gap-1">
							<strong>{player.name}</strong>
							<span className="font-mono text-sm text-base-content/70">
								{player.isHost ? "Host" : "Player"}
								{player.id === playerId ? " - You" : ""}
							</span>
						</div>
						<span
							className={
								player.isReady
									? "badge badge-primary badge-soft"
									: "badge badge-ghost"
							}
						>
							{player.isReady ? "Ready" : "Waiting"}
						</span>
					</li>
				))}
			</ul>

			<div className="flex flex-wrap gap-3">
				<button
					className="btn btn-primary"
					disabled={!canSend}
					onClick={onToggleReady}
					type="button"
				>
					{currentPlayer?.isReady ? "Cancel ready" : "Ready up"}
				</button>
				<button
					className="btn"
					disabled={!canSend || !currentPlayer?.isHost || !allReady}
					onClick={onStartGame}
					type="button"
				>
					Start game
				</button>
			</div>
		</section>
	);
}
