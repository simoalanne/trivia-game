"use client";

import type { QuestionCardInput } from "@packages/contracts";
import type { CardChange } from "backend/types";
import { Check, Eye, PencilIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalDecision } from "./useCardAgent";

const difficultyLabels: Record<QuestionCardInput["difficulty"], string> = {
	EASY: "Easy",
	MEDIUM: "Medium",
	HARD: "Hard",
};

const kindLabels: Record<CardChange["kind"], string> = {
	create: "New card",
	update: "Update",
	delete: "Delete",
};

const kindBadgeClassNames: Record<CardChange["kind"], string> = {
	create: "badge badge-success badge-soft",
	update: "badge badge-warning badge-soft",
	delete: "badge badge-error badge-soft",
};

type CardField = "prompt" | "meta" | "choices";

/** Which parts of `card` differ from `compareTo`, to highlight an update. */
const changedParts = (
	card: QuestionCardInput,
	compareTo?: QuestionCardInput,
) => {
	if (!compareTo) {
		return { fields: new Set<CardField>(), entries: new Set<number>() };
	}

	const choicesKey = (value: QuestionCardInput) =>
		value.answerMode === "CHOICES"
			? JSON.stringify([value.choices, value.choicesAreUnique])
			: "";
	const fields = new Set<CardField>();
	if (card.prompt !== compareTo.prompt) fields.add("prompt");
	if (
		card.difficulty !== compareTo.difficulty ||
		card.answerMode !== compareTo.answerMode ||
		card.tags.join("|") !== compareTo.tags.join("|")
	) {
		fields.add("meta");
	}
	if (choicesKey(card) !== choicesKey(compareTo)) fields.add("choices");

	const entries = new Set<number>();
	card.entries.forEach((entry, index) => {
		const other = compareTo.entries[index];
		if (!other || other.text !== entry.text || other.answer !== entry.answer) {
			entries.add(index);
		}
	});
	return { fields, entries };
};

const highlight = "rounded bg-warning/20 px-1 -mx-1";

type CardSummaryProps = {
	card: QuestionCardInput;
	/** Highlights what differs from this card. */
	compareTo?: QuestionCardInput;
	label?: string;
	muted?: boolean;
};

function CardSummary({ card, compareTo, label, muted }: CardSummaryProps) {
	const changed = changedParts(card, compareTo);

	return (
		<div
			className={cn("grid min-w-0 content-start gap-2", muted && "opacity-60")}
		>
			{label ? (
				<p className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
					{label}
				</p>
			) : null}
			<p
				className={cn(
					"font-semibold",
					changed.fields.has("prompt") && highlight,
				)}
			>
				{card.prompt}
			</p>
			<div
				className={cn(
					"flex flex-wrap gap-1",
					changed.fields.has("meta") && highlight,
				)}
			>
				<span className="badge badge-sm badge-ghost">
					{difficultyLabels[card.difficulty]}
				</span>
				<span className="badge badge-sm badge-ghost">
					{card.answerMode === "CHOICES" ? "Choices" : "Text"}
				</span>
				{card.tags.map((tag) => (
					<span className="badge badge-sm badge-outline" key={tag}>
						{tag}
					</span>
				))}
			</div>
			{card.answerMode === "CHOICES" ? (
				<p
					className={cn(
						"text-sm text-base-content/70",
						changed.fields.has("choices") && highlight,
					)}
				>
					Choices: {card.choices.join(", ")}
					{card.choicesAreUnique ? " (each used once)" : ""}
				</p>
			) : null}
			<ol className="grid gap-0.5 text-sm">
				{card.entries.map((entry, index) => (
					<li
						className={cn(
							"flex gap-2",
							changed.entries.has(index) && highlight,
						)}
						key={index}
					>
						<span className="min-w-0 flex-1 truncate">{entry.text}</span>
						<span className="min-w-0 max-w-1/2 truncate font-medium">
							{entry.answer}
						</span>
					</li>
				))}
			</ol>
		</div>
	);
}

type CardChangeItemProps = {
	change: CardChange;
	/** Review mode: proposals can be accepted, edited or rejected. */
	review: boolean;
	decision?: ProposalDecision;
	onAccept: () => void;
	onReject: () => void;
	onEdit: () => void;
	onPreview: (card: QuestionCardInput) => void;
	/** Auto mode: open the saved card in the form. */
	onOpen: () => void;
};

const statusLabel = (
	change: CardChange,
	review: boolean,
	decision?: ProposalDecision,
) => {
	if (!review) {
		return change.status === "failed"
			? { text: `Failed: ${change.error}`, className: "text-error" }
			: { text: "Saved", className: "text-success" };
	}
	switch (decision?.state) {
		case "accepted":
			return { text: "Accepted", className: "text-success" };
		case "rejected":
			return { text: "Rejected", className: "text-base-content/60" };
		case "failed":
			return { text: decision.error, className: "text-error" };
		default:
			return null;
	}
};

function CardChangeItem({
	change,
	review,
	decision,
	onAccept,
	onReject,
	onEdit,
	onPreview,
	onOpen,
}: CardChangeItemProps) {
	const status = statusLabel(change, review, decision);
	const isOpen = review && (!decision || decision.state === "failed");
	const isSaving = decision?.state === "saving";
	const resultCard =
		change.kind === "create"
			? change.card
			: change.kind === "update"
				? change.after
				: null;
	const canOpen =
		!review && change.status === "applied" && change.kind !== "delete";

	return (
		<li
			className={cn(
				"grid gap-3 rounded-box border border-base-300 bg-base-100 p-4",
				decision?.state === "rejected" && "opacity-60",
			)}
		>
			<div className="flex flex-wrap items-center gap-2">
				<span className={kindBadgeClassNames[change.kind]}>
					{kindLabels[change.kind]}
				</span>
				{change.kind !== "create" ? (
					<span className="text-sm text-base-content/60">#{change.id}</span>
				) : null}
				{status ? (
					<span className={cn("text-sm font-medium", status.className)}>
						{status.text}
					</span>
				) : null}
				<div className="ml-auto flex flex-wrap gap-1">
					{resultCard ? (
						<button
							className="btn btn-ghost btn-xs"
							onClick={() => onPreview(resultCard)}
							type="button"
						>
							<Eye className="size-3.5" />
							Preview
						</button>
					) : null}
					{canOpen ? (
						<button
							className="btn btn-ghost btn-xs"
							onClick={onOpen}
							type="button"
						>
							<PencilIcon className="size-3.5" />
							Open
						</button>
					) : null}
					{isOpen ? (
						<>
							{change.kind !== "delete" ? (
								<button
									className="btn btn-ghost btn-xs"
									disabled={isSaving}
									onClick={onEdit}
									type="button"
								>
									<PencilIcon className="size-3.5" />
									Edit
								</button>
							) : null}
							<button
								className="btn btn-ghost btn-xs"
								disabled={isSaving}
								onClick={onReject}
								type="button"
							>
								<X className="size-3.5" />
								Reject
							</button>
							<button
								className="btn btn-primary btn-xs"
								disabled={isSaving}
								onClick={onAccept}
								type="button"
							>
								<Check className="size-3.5" />
								{change.kind === "delete" ? "Delete" : "Accept"}
							</button>
						</>
					) : null}
					{isSaving ? (
						<span className="loading loading-spinner loading-xs" />
					) : null}
				</div>
			</div>

			{change.kind === "create" ? <CardSummary card={change.card} /> : null}
			{change.kind === "update" ? (
				<div className="grid gap-4 md:grid-cols-2">
					<CardSummary card={change.before} label="Before" muted />
					<CardSummary
						card={change.after}
						compareTo={change.before}
						label="After"
					/>
				</div>
			) : null}
			{change.kind === "delete" ? (
				<div className="line-through decoration-error/60">
					<CardSummary card={change.before} />
				</div>
			) : null}
		</li>
	);
}

type CardChangeListProps = Omit<
	CardChangeItemProps,
	"change" | "decision" | "onAccept" | "onReject" | "onEdit" | "onOpen"
> & {
	changes: CardChange[];
	decisions: Record<string, ProposalDecision>;
	onAccept: (change: CardChange) => void;
	onReject: (change: CardChange) => void;
	onEdit: (change: CardChange) => void;
	onOpen: (change: CardChange) => void;
};

export default function CardChangeList({
	changes,
	decisions,
	onAccept,
	onReject,
	onEdit,
	onOpen,
	...rest
}: CardChangeListProps) {
	return (
		<ul className="grid gap-3">
			{changes.map((change) => (
				<CardChangeItem
					change={change}
					decision={decisions[change.changeId]}
					key={change.changeId}
					onAccept={() => onAccept(change)}
					onEdit={() => onEdit(change)}
					onOpen={() => onOpen(change)}
					onReject={() => onReject(change)}
					{...rest}
				/>
			))}
		</ul>
	);
}
