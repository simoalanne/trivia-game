"use client";

import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { readUIMessageStream } from "ai";
import type { CardAgentUIMessage, CardChange } from "backend/types";
import { useCallback, useMemo, useRef, useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";

export type AgentReasoning = "none" | "low" | "medium" | "high";

type RunStatus = "idle" | "running" | "done" | "error";

/** What the user decided for one proposal in review mode. */
export type ProposalDecision =
	| { state: "saving" }
	| { state: "accepted" }
	| { state: "rejected" }
	| { state: "failed"; error: string };

type RunOptions = {
	instruction: string;
	autoApply: boolean;
	reasoning: AgentReasoning;
};

/**
 * The changes recorded by the write tools, latest version per card. A card
 * changed twice in one action keeps its `changeId`, so the last one wins.
 */
const collectChanges = (message: CardAgentUIMessage | null) => {
	const changes = new Map<string, CardChange>();
	for (const part of message?.parts ?? []) {
		if (
			(part.type === "tool-createCard" ||
				part.type === "tool-updateCard" ||
				part.type === "tool-deleteCard") &&
			part.state === "output-available"
		) {
			for (const change of part.output.changes) {
				changes.set(change.changeId, change);
			}
		}
	}
	return [...changes.values()];
};

const errorMessage = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback;

/**
 * Runs one stateless agent action and tracks what the user does with its
 * proposals. A new action starts from scratch.
 */
export function useCardAgent() {
	const { orpc, orpcClient, cardAgentClient } = useApiClient();
	const queryClient = useQueryClient();
	const abortRef = useRef<AbortController | null>(null);
	const [message, setMessage] = useState<CardAgentUIMessage | null>(null);
	const [status, setStatus] = useState<RunStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [autoApplied, setAutoApplied] = useState(false);
	const [decisions, setDecisions] = useState<Record<string, ProposalDecision>>(
		{},
	);

	const changes = useMemo(() => collectChanges(message), [message]);

	const refreshCards = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: orpc.questionsCrud.list.queryKey(),
			}),
		[orpc, queryClient],
	);

	const run = async ({ instruction, autoApply, reasoning }: RunOptions) => {
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setMessage(null);
		setDecisions({});
		setError(null);
		setAutoApplied(autoApply);
		setStatus("running");

		try {
			const iterator = await cardAgentClient.run(
				{ instruction, autoApply, reasoning },
				{ signal: controller.signal },
			);
			for await (const snapshot of readUIMessageStream<CardAgentUIMessage>({
				stream: eventIteratorToUnproxiedDataStream(iterator),
			})) {
				setMessage(snapshot);
			}
			setStatus("done");
		} catch (runError) {
			if (controller.signal.aborted) {
				setStatus("done");
			} else {
				setError(errorMessage(runError, "The assistant failed"));
				setStatus("error");
			}
		} finally {
			if (autoApply) {
				await refreshCards();
			}
		}
	};

	const stop = () => {
		abortRef.current?.abort();
	};

	const decide = (changeId: string, decision: ProposalDecision) => {
		setDecisions((current) => ({ ...current, [changeId]: decision }));
	};

	/**
	 * Returns false when the card is gone, or changed since the agent read it
	 * and the user doesn't want to overwrite it.
	 */
	const confirmNotStale = async (id: number, baseUpdatedAt: string) => {
		const current = await orpcClient.questionsCrud
			.getById({ params: { id } })
			.catch(() => null);
		if (!current) {
			throw new Error("The card no longer exists");
		}
		return (
			current.body.updatedAt === baseUpdatedAt ||
			window.confirm(
				"This card changed after the assistant read it. Save the proposal anyway?",
			)
		);
	};

	const accept = async (change: CardChange) => {
		decide(change.changeId, { state: "saving" });
		try {
			if (change.kind === "create") {
				await orpcClient.questionsCrud.create({ body: change.card });
			} else {
				if (!(await confirmNotStale(change.id, change.baseUpdatedAt))) {
					decide(change.changeId, {
						state: "failed",
						error: "Not saved: the card changed",
					});
					return;
				}
				if (change.kind === "update") {
					await orpcClient.questionsCrud.update({
						params: { id: change.id },
						body: change.after,
					});
				} else {
					await orpcClient.questionsCrud.delete({ params: { id: change.id } });
				}
			}
			decide(change.changeId, { state: "accepted" });
			await refreshCards();
		} catch (acceptError) {
			decide(change.changeId, {
				state: "failed",
				error: errorMessage(acceptError, "Failed to save"),
			});
		}
	};

	const isOpen = (change: CardChange) => {
		const decision = decisions[change.changeId];
		return !decision || decision.state === "failed";
	};

	const openProposals = autoApplied ? [] : changes.filter(isOpen);

	return {
		message,
		status,
		error,
		autoApplied,
		changes,
		decisions,
		openProposals,
		/** An action is committed once no proposal is waiting for a decision. */
		isCommitted: status !== "running" && openProposals.length === 0,
		run,
		stop,
		accept,
		reject: (change: CardChange) =>
			decide(change.changeId, { state: "rejected" }),
		/** For a proposal the user saved through the card form. */
		markAccepted: (change: CardChange) =>
			decide(change.changeId, { state: "accepted" }),
		acceptAll: async () => {
			for (const change of openProposals) {
				await accept(change);
			}
		},
		rejectAll: () => {
			for (const change of openProposals) {
				decide(change.changeId, { state: "rejected" });
			}
		},
	};
}
