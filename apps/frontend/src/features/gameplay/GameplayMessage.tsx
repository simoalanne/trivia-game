"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type GameplayMessageTone = "success" | "error" | "warning" | "info";

type GameplayMessageProps = {
	body: ReactNode;
	details?: ReactNode;
	icon: ReactNode;
	title: ReactNode;
	tone: GameplayMessageTone;
};

const toneClassNameByTone: Record<GameplayMessageTone, string> = {
	success: "alert-success",
	error: "alert-error",
	warning: "alert-warning",
	info: "alert-info",
};

export function useTimedGameplayMessage<T>(durationMs: number) {
	const [message, setMessage] = useState<T | null>(null);
	const timeoutRef = useRef<number | null>(null);

	const clearMessageTimeout = useCallback(() => {
		if (timeoutRef.current === null) {
			return;
		}

		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	}, []);

	const showMessage = useCallback(
		(nextMessage: T) => {
			clearMessageTimeout();
			setMessage(nextMessage);
			timeoutRef.current = window.setTimeout(() => {
				setMessage(null);
				timeoutRef.current = null;
			}, durationMs);
		},
		[clearMessageTimeout, durationMs],
	);

	useEffect(
		() => () => {
			clearMessageTimeout();
		},
		[clearMessageTimeout],
	);

	return {
		message,
		showMessage,
	};
}

export default function GameplayMessage({
	body,
	details,
	icon,
	title,
	tone,
}: GameplayMessageProps) {
	return (
		<div className="toast toast-top toast-center z-50 mt-4 w-full max-w-[min(34rem,calc(100vw-2rem))]">
			<div
				className={`alert alert-vertical items-start shadow-lg ${toneClassNameByTone[tone]}`}
				role="alert"
			>
				<div className="flex items-start gap-3">
					<div className="mt-1">{icon}</div>
					<div className="grid gap-1">
						<p className="text-sm font-semibold">{title}</p>
						<p className="text-lg font-bold">{body}</p>
						{details ? <div className="text-sm">{details}</div> : null}
					</div>
				</div>
			</div>
		</div>
	);
}
