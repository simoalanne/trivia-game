"use client";

import type { TurnResolvedMessage } from "@packages/contracts";
import { CheckIcon, XIcon } from "lucide-react";
import { formatCountryDisplay } from "@/components/countryDisplay";
import GameplayMessage from "./GameplayMessage";

type SubmittedResolution = Extract<
	TurnResolvedMessage,
	{ resolution: "submitted" }
>;

type AnswerResolutionToastProps = {
	resolution: TurnResolvedMessage | null;
};

const normalizeResolvedAnswer = (turnResolution: SubmittedResolution) => {
	if (turnResolution.answerMode !== "COUNTRY") {
		return {
			answer: turnResolution.answer,
			correctAnswer: turnResolution.correctAnswer,
		};
	}

	return {
		answer: formatCountryDisplay(turnResolution.answer),
		correctAnswer: formatCountryDisplay(turnResolution.correctAnswer),
	};
};

export function AnswerResolutionToast({
	resolution,
}: AnswerResolutionToastProps) {
	if (!resolution) {
		return null;
	}

	const isCorrect =
		resolution.resolution === "submitted" && resolution.isCorrect;
	const normalizedResolution =
		resolution.resolution === "submitted"
			? normalizeResolvedAnswer(resolution)
			: null;

	return (
		<GameplayMessage
			body={
				resolution.resolution === "submitted" ? (
					<>
						<strong>{resolution.playerName}</strong>
						<span> answered: </span>
						<strong>{normalizedResolution?.answer}</strong>
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
								<strong>{normalizedResolution?.correctAnswer}</strong>
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
