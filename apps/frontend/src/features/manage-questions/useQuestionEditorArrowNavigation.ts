"use client";

import { useEffect } from "react";

export function useQuestionEditorArrowNavigation(open: boolean) {
	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey
			) {
				return;
			}

			if (event.key === "ArrowLeft") {
				const activeElement = document.activeElement;
				if (
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement
				) {
					return;
				}

				event.preventDefault();
				window.dispatchEvent(new CustomEvent("question-editor-previous-entry"));
				return;
			}

			if (event.key === "ArrowRight") {
				const activeElement = document.activeElement;
				if (
					activeElement instanceof HTMLInputElement ||
					activeElement instanceof HTMLTextAreaElement
				) {
					return;
				}

				event.preventDefault();
				window.dispatchEvent(new CustomEvent("question-editor-next-entry"));
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open]);
}
