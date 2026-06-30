"use client";

import type { PlayersUpdateMessage } from "@packages/contracts";
import { LogInIcon, LogOutIcon } from "lucide-react";
import GameplayMessage from "./GameplayMessage";

type PlayerPresenceToastProps = {
	message: PlayersUpdateMessage | null;
};

export default function PlayerPresenceToast({
	message,
}: PlayerPresenceToastProps) {
	if (!message) {
		return null;
	}

	return (
		<GameplayMessage
			body={
				<>
					<strong>{message.playerName}</strong>
					<span>
						{message.kind === "join" ? " joined the game" : " left the game"}
					</span>
				</>
			}
			icon={
				message.kind === "join" ? (
					<LogInIcon aria-hidden="true" size={24} />
				) : (
					<LogOutIcon aria-hidden="true" size={24} />
				)
			}
			title="Player update"
			tone="info"
		/>
	);
}
