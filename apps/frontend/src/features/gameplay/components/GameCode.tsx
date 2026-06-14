"use client";

import { CopyIcon } from "lucide-react";
import styles from "./GameCode.module.css";

type GameCodeProps = {
	code: string;
	label?: string;
	onCopy?: (code: string) => void;
};

export function GameCode({
	code,
	label = "Game code:",
	onCopy,
}: GameCodeProps) {
	const normalizedCode = code.toUpperCase();

	const copyCode = () => {
		if (onCopy) {
			onCopy(normalizedCode);
			return;
		}

		void navigator.clipboard?.writeText(normalizedCode);
	};

	return (
		<div className={styles.gameCode}>
			<span>{label}</span>
			<strong>{normalizedCode}</strong>
			<button
				aria-label={`Copy game code ${normalizedCode}`}
				onClick={copyCode}
				type="button"
			>
				<CopyIcon aria-hidden="true" size={16} />
			</button>
		</div>
	);
}
