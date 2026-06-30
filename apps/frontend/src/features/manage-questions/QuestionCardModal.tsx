"use client";

import type { QuestionCard } from "@packages/contracts";
import { Modal } from "@/components";

type QuestionCardModalProps = {
	open: boolean;
	question?: QuestionCard | null;
	setOpen: (open: boolean) => void;
};

export default function QuestionCardModal({
	open,
	question,
	setOpen,
}: QuestionCardModalProps) {
	const mode = question ? "edit" : "create";
	const title =
		mode === "edit" && question
			? `Edit Trivia Card #${question.id}`
			: "Create Trivia Card";

	return (
		<Modal
			footer={
				<div className="flex w-full justify-end">
					<button
						className="btn btn-primary"
						onClick={() => {
							setOpen(false);
						}}
						type="button"
					>
						Close
					</button>
				</div>
			}
			mobileSheet={false}
			open={open}
			setOpen={setOpen}
			size="lg"
			title={title}
		>
			<div className="grid gap-4 px-3 pb-2">
				<div className="alert">
					<span>
						The question card editor is temporarily disabled while the new
						authoring flow is being rebuilt on top of the simplified
						`answerMode` model.
					</span>
				</div>

				{question ? (
					<div className="grid gap-2 text-sm">
						<p>
							<span className="font-semibold">Prompt:</span> {question.prompt}
						</p>
						<p>
							<span className="font-semibold">Answer mode:</span>{" "}
							{question.answerMode}
						</p>
						<p>
							<span className="font-semibold">Entries:</span>{" "}
							{question.entries.length}
						</p>
					</div>
				) : (
					<p className="text-sm text-base-content/70">
						Create is intentionally paused until the new modal lands.
					</p>
				)}
			</div>
		</Modal>
	);
}
