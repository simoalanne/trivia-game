import { PauseIcon, PlayIcon } from "lucide-react";
import Link from "next/link";
import { GameCode } from "./GameCode";
import { PlayerList, type PlayerListItem } from "./PlayerList";

type GameplaySidebarProps = {
	canTogglePause: boolean;
	gameCode: string;
	isTurnPaused: boolean;
	lobbyHref: string;
	onTogglePause: () => void;
	players: PlayerListItem[];
};

export function GameplaySidebar({
	canTogglePause,
	gameCode,
	isTurnPaused,
	lobbyHref,
	onTogglePause,
	players,
}: GameplaySidebarProps) {
	return (
		<div className="grid gap-6 p-5">
			<div className="flex items-center justify-between gap-3">
				<Link className="text-lg font-bold" href={lobbyHref}>
					TriviaGame
				</Link>
			</div>

			<section className="grid gap-3">
				<h2 className="text-sm font-semibold opacity-70">Players</h2>
				<PlayerList players={players} />
			</section>

			<section className="border-base-300 grid gap-3 border-t pt-5">
				<GameCode code={gameCode} label="Share code" />

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
			</section>
		</div>
	);
}
