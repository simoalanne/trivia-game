"use client";

import type { QuestionCard, QuestionCardInput } from "@packages/contracts";
import { useQuery } from "@tanstack/react-query";
import type { CardAgentUIMessage, CardChange } from "backend/types";
import { Sparkles, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import { cn } from "@/lib/utils";
import CardChangeList from "./CardChangeList";
import QuestionCardModal from "./QuestionCardModal";
import QuestionCardPreviewModal from "./QuestionCardPreviewModal";
import { type AgentReasoning, useCardAgent } from "./useCardAgent";

const reasoningLevels: AgentReasoning[] = ["none", "low", "medium", "high"];
const reasoningLabels: Record<AgentReasoning, string> = {
	none: "None",
	low: "Low",
	medium: "Medium",
	high: "High",
};
const REASONING_STORAGE_KEY = "cardAgent.reasoning";

const examples = [
	"Create a card where players name the capital of each Nordic nation.",
	"Make the hard sports cards medium.",
	"Delete every card tagged Test.",
];

type MessagePart = CardAgentUIMessage["parts"][number];

/** One line of live status for a tool call, or null for other parts. */
const describeToolPart = (part: MessagePart) => {
	switch (part.type) {
		case "tool-searchCards": {
			const query = part.input?.query ?? part.input?.tags?.join(", ");
			const found =
				part.state === "output-available"
					? ` (${part.output.total} found)`
					: "";
			return `Searching cards${query ? ` for “${query}”` : ""}${found}`;
		}
		case "tool-getCard":
			return `Reading card${part.input?.id ? ` #${part.input.id}` : ""}`;
		case "tool-listTags":
			return "Listing tags";
		case "tool-createCard":
			return `Creating card${part.input?.prompt ? ` “${part.input.prompt}”` : ""}`;
		case "tool-updateCard":
			return `Updating card${part.input?.id ? ` #${part.input.id}` : ""}`;
		case "tool-deleteCard":
			return `Deleting ${part.input?.ids?.length ?? ""} card(s)`;
		default:
			return null;
	}
};

/** Write tools report validation errors as output, which the model then fixes. */
const toolProblem = (part: MessagePart) => {
	if (!part.type.startsWith("tool-") || !("state" in part)) {
		return null;
	}
	if (part.state === "output-error") {
		return part.errorText;
	}
	if (
		(part.type === "tool-createCard" ||
			part.type === "tool-updateCard" ||
			part.type === "tool-deleteCard") &&
		part.state === "output-available" &&
		part.output.errors.length > 0
	) {
		return part.output.errors.join("; ");
	}
	return null;
};

const readStoredReasoning = () => {
	try {
		const value = localStorage.getItem(REASONING_STORAGE_KEY);
		return reasoningLevels.find((level) => level === value) ?? null;
	} catch {
		return null;
	}
};

function Activity({
	message,
	running,
}: {
	message: CardAgentUIMessage | null;
	running: boolean;
}) {
	const parts = message?.parts ?? [];
	const reasoning = parts
		.filter((part) => part.type === "reasoning")
		.map((part) => part.text)
		.join("\n\n")
		.trim();
	const reply = parts
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("")
		.trim();
	const steps = parts.flatMap((part, index) => {
		const label = describeToolPart(part);
		if (!label || !("state" in part)) {
			return [];
		}
		const done =
			part.state === "output-available" || part.state === "output-error";
		return [{ key: index, label, done, problem: toolProblem(part) }];
	});

	if (!message && !running) {
		return null;
	}

	return (
		<div className="grid gap-2 text-sm">
			{reasoning ? (
				<details className="collapse collapse-arrow rounded-box bg-base-200">
					<summary className="collapse-title min-h-0 py-2 text-sm text-base-content/70">
						Thinking…
					</summary>
					<p className="collapse-content whitespace-pre-wrap text-xs text-base-content/70">
						{reasoning}
					</p>
				</details>
			) : null}
			{steps.length > 0 ? (
				<ul className="grid gap-1">
					{steps.map((step) => (
						<li className="flex items-start gap-2" key={step.key}>
							{step.done ? (
								<span
									className={cn(
										"mt-1.5 size-2 shrink-0 rounded-full",
										step.problem ? "bg-error" : "bg-success",
									)}
								/>
							) : (
								<span className="loading loading-spinner loading-xs mt-0.5" />
							)}
							<span className="min-w-0">
								<span className="block truncate">{step.label}</span>
								{step.problem ? (
									<span className="block text-xs text-error">
										{step.problem}
									</span>
								) : null}
							</span>
						</li>
					))}
				</ul>
			) : null}
			{running && steps.length === 0 && !reply ? (
				<p className="flex items-center gap-2 text-base-content/70">
					<span className="loading loading-dots loading-xs" />
					{reasoning ? "Thinking" : "Working"}
				</p>
			) : null}
			{reply ? <p className="font-medium">{reply}</p> : null}
		</div>
	);
}

/** Auto mode: "Created 3 · Updated 2 · Deleted 1 · Failed 1". */
const summarize = (changes: CardChange[]) => {
	const applied = changes.filter((change) => change.status === "applied");
	const count = (kind: CardChange["kind"]) =>
		applied.filter((change) => change.kind === kind).length;
	const failed = changes.length - applied.length;
	return [
		["Created", count("create")],
		["Updated", count("update")],
		["Deleted", count("delete")],
		["Failed", failed],
	]
		.filter(([, value]) => value)
		.map(([label, value]) => `${label} ${value}`)
		.join(" · ");
};

type EditTarget = {
	change: CardChange;
	question: QuestionCard | null;
	draft: QuestionCardInput | null;
};

export default function CardAgentPanel() {
	const { cardAgentClient } = useApiClient();
	const settings = useQuery({
		queryKey: ["cardAgent", "settings"],
		queryFn: () => cardAgentClient.settings(),
		staleTime: Number.POSITIVE_INFINITY,
	});
	const agent = useCardAgent();
	const [instruction, setInstruction] = useState("");
	const [autoApply, setAutoApply] = useState(false);
	const [reasoning, setReasoning] = useState<AgentReasoning | null>(null);
	const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
	const [previewCard, setPreviewCard] = useState<QuestionCardInput | null>(
		null,
	);

	useEffect(() => {
		setReasoning(readStoredReasoning());
	}, []);

	const serverDefault = reasoningLevels.find(
		(level) => level === settings.data?.reasoningDefault,
	);
	const selectedReasoning = reasoning ?? serverDefault ?? "none";
	const running = agent.status === "running";
	const locked = running || !agent.isCommitted;
	const review = !agent.autoApplied;
	const hasResult = agent.status === "done" || agent.status === "error";

	const chooseReasoning = (level: AgentReasoning) => {
		setReasoning(level);
		try {
			localStorage.setItem(REASONING_STORAGE_KEY, level);
		} catch {
			// Not remembered, which is fine.
		}
	};

	const submit = () => {
		const trimmed = instruction.trim();
		if (!trimmed || locked) {
			return;
		}
		void agent.run({
			instruction: trimmed,
			autoApply,
			reasoning: selectedReasoning,
		});
	};

	const editChange = (change: CardChange) => {
		if (change.kind === "create") {
			setEditTarget({ change, question: null, draft: change.card });
		} else if (change.kind === "update") {
			setEditTarget({
				change,
				question: {
					...change.before,
					id: change.id,
					updatedAt: change.baseUpdatedAt,
				},
				draft: change.after,
			});
		}
	};

	const openSaved = (change: CardChange) => {
		if (change.kind !== "delete" && change.savedCard) {
			setEditTarget({ change, question: change.savedCard, draft: null });
		}
	};

	return (
		<section
			aria-labelledby="card-agent-title"
			className="grid gap-4 rounded-box border border-base-300 bg-base-100 p-4 sm:p-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8"
		>
			<div className="grid content-start gap-4">
				<div>
					<h2
						className="flex items-center gap-2 text-xl font-bold"
						id="card-agent-title"
					>
						<Sparkles className="size-5 text-primary" />
						Assistant
					</h2>
					<p className="text-sm text-base-content/70">
						Describe a change to the deck.
						{settings.data ? ` Model: ${settings.data.model}.` : ""}
					</p>
				</div>

				<textarea
					className="textarea w-full"
					disabled={locked}
					onChange={(event) => setInstruction(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							submit();
						}
					}}
					placeholder={examples[0]}
					rows={4}
					value={instruction}
				/>

				<div className="grid gap-1">
					<div className="flex items-center justify-between text-sm">
						<span className="font-semibold">Reasoning</span>
						<span className="text-base-content/60">
							Slower, better for tricky edits
						</span>
					</div>
					<input
						className="range range-xs"
						disabled={locked}
						max={reasoningLevels.length - 1}
						min={0}
						onChange={(event) =>
							chooseReasoning(
								reasoningLevels[Number(event.target.value)] ?? "none",
							)
						}
						step={1}
						type="range"
						value={reasoningLevels.indexOf(selectedReasoning)}
					/>
					<div className="flex justify-between px-0.5 text-xs text-base-content/70">
						{reasoningLevels.map((level) => (
							<span
								className={cn(
									level === selectedReasoning && "font-bold text-base-content",
								)}
								key={level}
							>
								{reasoningLabels[level]}
							</span>
						))}
					</div>
				</div>

				<label className="label cursor-pointer justify-start gap-3">
					<input
						checked={autoApply}
						className="toggle toggle-sm"
						disabled={locked}
						onChange={(event) => setAutoApply(event.target.checked)}
						type="checkbox"
					/>
					<span className="text-sm text-base-content">
						Auto-apply
						<span className="block text-xs text-base-content/60">
							{autoApply
								? "Changes, deletes included, are saved right away."
								: "Review each change before it's saved."}
						</span>
					</span>
				</label>

				<div className="flex gap-2">
					{running ? (
						<button
							className="btn btn-block"
							onClick={agent.stop}
							type="button"
						>
							<Square className="size-4" />
							Stop
						</button>
					) : (
						<button
							className="btn btn-primary btn-block"
							disabled={locked || !instruction.trim()}
							onClick={submit}
							type="button"
						>
							Run
						</button>
					)}
				</div>
				{!running && locked ? (
					<p className="text-xs text-base-content/60">
						Accept or reject every proposal before the next instruction.
					</p>
				) : null}
			</div>

			<div className="grid min-w-0 content-start gap-4">
				{!agent.message && !running && !agent.error ? (
					<div className="grid gap-2 rounded-box border border-dashed border-base-300 p-6 text-sm text-base-content/60">
						<p>Changes show up here. For example:</p>
						<ul className="grid gap-1">
							{examples.map((example) => (
								<li key={example}>
									<button
										className="link link-hover text-left"
										disabled={locked}
										onClick={() => setInstruction(example)}
										type="button"
									>
										“{example}”
									</button>
								</li>
							))}
						</ul>
					</div>
				) : null}

				<Activity message={agent.message} running={running} />

				{agent.error ? (
					<div className="alert alert-error">
						<span>{agent.error}</span>
					</div>
				) : null}

				{agent.changes.length > 0 ? (
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h3 className="font-bold">
								{review
									? `Proposals (${agent.openProposals.length} open)`
									: summarize(agent.changes)}
							</h3>
							{review && agent.openProposals.length > 1 && !running ? (
								<div className="flex gap-2">
									<button
										className="btn btn-ghost btn-sm"
										onClick={agent.rejectAll}
										type="button"
									>
										Reject all
									</button>
									<button
										className="btn btn-primary btn-sm"
										onClick={() => void agent.acceptAll()}
										type="button"
									>
										Accept all
									</button>
								</div>
							) : null}
						</div>
						<CardChangeList
							changes={agent.changes}
							decisions={agent.decisions}
							onAccept={(change) => void agent.accept(change)}
							onEdit={editChange}
							onOpen={openSaved}
							onPreview={setPreviewCard}
							onReject={agent.reject}
							review={review}
						/>
					</div>
				) : hasResult && !agent.error ? (
					<p className="text-sm text-base-content/60">No changes.</p>
				) : null}
			</div>

			<QuestionCardModal
				draft={editTarget?.draft}
				onSaved={() => {
					if (editTarget?.draft) {
						agent.markAccepted(editTarget.change);
					}
				}}
				open={editTarget !== null}
				question={editTarget?.question}
				setOpen={(open) => {
					if (!open) {
						setEditTarget(null);
					}
				}}
			/>
			<QuestionCardPreviewModal
				open={previewCard !== null}
				question={previewCard}
				setOpen={(open) => {
					if (!open) {
						setPreviewCard(null);
					}
				}}
			/>
		</section>
	);
}
