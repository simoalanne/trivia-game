"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type GameCodeProps = {
	code: string;
	label?: string;
	onCopy?: (code: string) => void;
};

const copiedStateDurationMs = 2200;

export function GameCode({ code, label = "Game code", onCopy }: GameCodeProps) {
	const normalizedCode = code.toUpperCase();
	const [copied, setCopied] = useState(false);
	const resetCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	useEffect(() => {
		return () => {
			if (resetCopiedTimeoutRef.current) {
				clearTimeout(resetCopiedTimeoutRef.current);
			}
		};
	}, []);

	const copyCode = () => {
		if (onCopy) {
			onCopy(normalizedCode);
		} else {
			void navigator.clipboard?.writeText(normalizedCode);
		}

		setCopied(true);

		if (resetCopiedTimeoutRef.current) {
			clearTimeout(resetCopiedTimeoutRef.current);
		}

		resetCopiedTimeoutRef.current = setTimeout(() => {
			setCopied(false);
			resetCopiedTimeoutRef.current = null;
		}, copiedStateDurationMs);
	};

	return (
		<button
			aria-label={
				copied
					? `Copied game code ${normalizedCode}`
					: `Copy game code ${normalizedCode}`
			}
			className="btn btn-sm transition-transform duration-200 hover:-translate-y-0.5 w-50"
			onClick={copyCode}
			type="button"
		>
			{copied ? (
				<>
					<CheckIcon aria-hidden="true" className="size-4 text-success" />
					<span className="font-normal opacity-70">Copied!</span>
				</>
			) : (
				<>
					<CopyIcon aria-hidden="true" className="size-4" />
					<span className="font-normal opacity-70">{label}</span>
					<span className="font-mono text-base font-bold tracking-wide">
						{normalizedCode}
					</span>
				</>
			)}
		</button>
	);
}
