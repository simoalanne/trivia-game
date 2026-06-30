"use client";

import type { QuestionCard } from "@packages/contracts";
import { useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import QuestionCardModal from "./QuestionCardModal";
import QuestionCardPreviewModal from "./QuestionCardPreviewModal";
import TriviaCardsTable from "./TriviaCardsTable";

export default function ManageQuestionsListPage() {
	const api = useApiClient();
	const questions = api.questionsCrud.list.useQuery();
	const [editorQuestion, setEditorQuestion] = useState<QuestionCard | null>(
		null,
	);
	const [previewQuestion, setPreviewQuestion] = useState<QuestionCard | null>(
		null,
	);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const deleteQuestion = api.questionsCrud.delete.useMutation({
		onSuccess: (deletedQuestion) => {
			api.questionsCrud.list.setData(
				(current) =>
					current?.filter((question) => question.id !== deletedQuestion.id) ??
					[],
			);
			api.questionsCrud.getById.clear({ id: deletedQuestion.id });
		},
	});

	const handleDelete = (question: QuestionCard) => {
		if (
			!window.confirm(`Delete "${question.prompt}"? This cannot be undone.`)
		) {
			return;
		}

		deleteQuestion.mutate({ id: question.id });
	};

	return (
		<main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12">
			<section
				className="grid min-w-0 w-full gap-6"
				aria-labelledby="manage-questions-title"
			>
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div className="min-w-0 flex-1">
						<h1
							id="manage-questions-title"
							className="text-4xl leading-none font-bold"
						>
							Manage question cards
						</h1>
						<p className="mt-2 text-base-content/70">
							Add and maintain the trivia cards that power live gameplay.
						</p>
					</div>
					<button
						className="btn btn-primary w-full sm:w-auto"
						onClick={() => {
							setEditorQuestion(null);
							setIsCreateModalOpen(true);
						}}
						type="button"
					>
						Create Trivia Card
					</button>
				</div>

				{questions.isLoading ? <p>Loading questions...</p> : null}

				{questions.error ? (
					<p className="text-error font-semibold">{questions.error.message}</p>
				) : null}

				{deleteQuestion.error ? (
					<p className="text-error font-semibold">
						{deleteQuestion.error.message}
					</p>
				) : null}

				{questions.data ? (
					<TriviaCardsTable
						onEdit={(question) => {
							setEditorQuestion(question);
							setPreviewQuestion(null);
							setIsCreateModalOpen(false);
						}}
						isDeleting={deleteQuestion.isPending}
						onDelete={handleDelete}
						onPreview={(question) => {
							setPreviewQuestion(question);
							setEditorQuestion(null);
							setIsCreateModalOpen(false);
						}}
						triviaCards={questions.data}
					/>
				) : questions.isLoading ? null : (
					<TriviaCardsTable
						onEdit={(question) => {
							setEditorQuestion(question);
							setPreviewQuestion(null);
							setIsCreateModalOpen(false);
						}}
						isDeleting={deleteQuestion.isPending}
						onDelete={handleDelete}
						onPreview={(question) => {
							setPreviewQuestion(question);
							setEditorQuestion(null);
							setIsCreateModalOpen(false);
						}}
						triviaCards={[]}
					/>
				)}
			</section>
			<QuestionCardModal
				open={isCreateModalOpen}
				setOpen={(open) => {
					setIsCreateModalOpen(open);
				}}
			/>
			<QuestionCardModal
				open={editorQuestion !== null}
				question={editorQuestion}
				setOpen={(open) => {
					if (!open) {
						setEditorQuestion(null);
					}
				}}
			/>
			<QuestionCardPreviewModal
				open={previewQuestion !== null}
				question={previewQuestion}
				setOpen={(open) => {
					if (!open) {
						setPreviewQuestion(null);
					}
				}}
			/>
		</main>
	);
}
