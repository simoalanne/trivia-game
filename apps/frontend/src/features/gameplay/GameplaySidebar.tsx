import { LogOutIcon, PauseIcon, PlayIcon } from "lucide-react";
import { GameCode } from "./GameCode";
import { PlayerList, type PlayerListItem } from "./PlayerList";

type GameplaySidebarProps = {
	canTogglePause: boolean;
	gameCode: string;
	inviteHref: string;
	isLeavingGame: boolean;
	isTurnPaused: boolean;
	onLeaveGame: () => void;
	onTogglePause: () => void;
	players: PlayerListItem[];
};

export function GameplaySidebar({
	canTogglePause,
	gameCode,
	inviteHref,
	isLeavingGame,
	isTurnPaused,
	onLeaveGame,
	onTogglePause,
	players,
}: GameplaySidebarProps) {
	return (
		<div className="grid gap-6 p-5">
			<section className="grid gap-3">
				<h2 className="text-sm font-semibold opacity-70">Players</h2>
				<PlayerList players={players} />
			</section>

			<section className="border-base-300 grid gap-3 border-t pt-5">
				<GameCode code={gameCode} copyValue={inviteHref} label="Copy invite" />

				{canTogglePause ? (
					<button
						className="btn btn-sm btn-block"
						onClick={onTogglePause}
						type="button"
					>
						{isTurnPaused ? (
							<PlayIcon aria-hidden="true" className="size-4" />
						) : (
							<PauseIcon aria-hidden="true" className="size-4" />
						)}
						{isTurnPaused ? "Resume timer" : "Pause timer"}
					</button>
				) : null}

				<button
					className="btn btn-error btn-soft btn-sm btn-block mt-2"
					disabled={isLeavingGame}
					onClick={onLeaveGame}
					type="button"
				>
					<LogOutIcon aria-hidden="true" className="size-4" />
					Leave game
				</button>
			</section>
		</div>
	);
}
