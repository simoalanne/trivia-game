"use client";

import type { TurnResolvedMessage } from "@packages/contracts";
import { CheckIcon, XIcon } from "lucide-react";
import GameplayMessage from "./GameplayMessage";

type AnswerResolutionToastProps = {
	resolution: TurnResolvedMessage | null;
};

export function AnswerResolutionToast({
	resolution,
}: AnswerResolutionToastProps) {
	if (!resolution) {
		return null;
	}

	const isCorrect =
		resolution.resolution === "submitted" && resolution.isCorrect;

	return (
		<GameplayMessage
			body={
				resolution.resolution === "submitted" ? (
					<>
						<strong>{resolution.playerName}</strong>
						<span> answered: </span>
						<strong>{resolution.answer}</strong>
					</>
				) : (
					<>
						<strong>{resolution.playerName}</strong>
						<span> ran out of time</span>
					</>
				)
			}
			details={
				resolution.resolution === "submitted" ? (
					<>
						<p className="font-bold">
							{resolution.isCorrect ? "Correct" : "Wrong"}
						</p>
						{!resolution.isCorrect ? (
							<p>
								<span className="font-medium">Correct answer: </span>
								<strong>{resolution.correctAnswer}</strong>
							</p>
						) : null}
					</>
				) : (
					<p className="font-bold">Timed out</p>
				)
			}
			icon={
				isCorrect ? (
					<CheckIcon aria-hidden="true" size={24} />
				) : (
					<XIcon aria-hidden="true" size={24} />
				)
			}
			title={
				resolution.resolution === "submitted"
					? resolution.prompt
					: `${resolution.playerName}'s turn ended`
			}
			tone={isCorrect ? "success" : "error"}
		/>
	);
}
