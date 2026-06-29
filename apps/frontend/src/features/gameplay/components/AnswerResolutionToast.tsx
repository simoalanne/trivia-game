"use client";

import type { TurnResolvedMessage } from "@packages/contracts";
import { CheckIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCountryDisplay } from "@/components/countryDisplay";

type SubmittedResolution = Extract<
	TurnResolvedMessage,
	{ resolution: "submitted" }
>;

type AnswerResolutionToastProps = {
	resolution: TurnResolvedMessage | null;
};

const normalizeResolvedAnswer = (turnResolution: SubmittedResolution) => {
	if (turnResolution.uiHint !== "COUNTRY") {
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

export function useAnswerResolutionToast(durationMs: number) {
	const [resolution, setResolution] = useState<TurnResolvedMessage | null>(
		null,
	);
	const timeoutRef = useRef<number | null>(null);

	const clearToastTimeout = useCallback(() => {
		if (timeoutRef.current === null) {
			return;
		}

		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	}, []);

	const showAnswerResolutionToast = useCallback(
		(nextResolution: TurnResolvedMessage) => {
			clearToastTimeout();
			setResolution(nextResolution);
			timeoutRef.current = window.setTimeout(() => {
				setResolution(null);
				timeoutRef.current = null;
			}, durationMs);
		},
		[clearToastTimeout, durationMs],
	);

	useEffect(
		() => () => {
			clearToastTimeout();
		},
		[clearToastTimeout],
	);

	return {
		answerResolutionToast: resolution,
		showAnswerResolutionToast,
	};
}

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
		<div className="toast toast-top toast-center z-50 mt-4 w-full max-w-[min(34rem,calc(100vw-2rem))]">
			<div
				className={`alert alert-vertical items-start shadow-lg ${
					isCorrect ? "alert-success" : "alert-error"
				}`}
				role="alert"
			>
				<div className="flex items-start gap-3">
					<div className="mt-1">
						{isCorrect ? (
							<CheckIcon aria-hidden="true" size={24} />
						) : (
							<XIcon aria-hidden="true" size={24} />
						)}
					</div>
					<div className="grid gap-1">
						<p className="text-sm font-semibold">
							{resolution.resolution === "submitted"
								? resolution.prompt
								: `${resolution.playerName}'s turn ended`}
						</p>
						<p className="text-lg font-bold">
							<strong>{resolution.playerName}</strong>
							{resolution.resolution === "submitted" ? (
								<>
									<span> answered: </span>
									<strong>{normalizedResolution?.answer}</strong>
								</>
							) : (
								<span> ran out of time</span>
							)}
						</p>
						<p className="text-sm font-bold">
							{resolution.resolution === "submitted"
								? resolution.isCorrect
									? "Correct"
									: "Wrong"
								: "Timed out"}
						</p>
						{resolution.resolution === "submitted" && !resolution.isCorrect ? (
							<p className="text-sm">
								<span className="font-medium">Correct answer: </span>
								<strong>{normalizedResolution?.correctAnswer}</strong>
							</p>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
