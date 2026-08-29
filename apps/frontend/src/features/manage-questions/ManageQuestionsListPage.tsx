"use client";

import type { QuestionCard } from "@packages/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import QuestionCardModal from "./QuestionCardModal";
import QuestionCardPreviewModal from "./QuestionCardPreviewModal";
import TriviaCardsTable from "./TriviaCardsTable";

type OpenModal = "editor" | "preview" | null;

export default function ManageQuestionsListPage() {
	const { tq } = useApiClient();
	const queryClient = useQueryClient();
	const questions = useQuery(tq.questionsCrud.list.queryOptions());
	const [selectedQuestion, setSelectedQuestion] = useState<QuestionCard | null>(
		null,
	);
	const [openModal, setOpenModal] = useState<OpenModal>(null);
	const deleteQuestion = useMutation(
		tq.questionsCrud.delete.mutationOptions({
			onSuccess: (deletedQuestion) => {
				queryClient.setQueryData(tq.questionsCrud.list.getKey(), (current) =>
					current
						? {
								...current,
								body: current.body.filter(
									(question) => question.id !== deletedQuestion.body.id,
								),
							}
						: current,
				);
				queryClient.removeQueries({
					queryKey: tq.questionsCrud.getById.getKey({
						id: deletedQuestion.body.id,
					}),
				});
			},
		}),
	);

	const handleDelete = (question: QuestionCard) => {
		if (
			!window.confirm(`Delete "${question.prompt}"? This cannot be undone.`)
		) {
			return;
		}

		deleteQuestion.mutate({ id: question.id });
	};

	const handlePreview = (question: QuestionCard) => {
		setSelectedQuestion(question);
		setOpenModal("preview");
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
							setSelectedQuestion(null);
							setOpenModal("editor");
						}}
						type="button"
					>
						Create Trivia Card
					</button>
				</div>

				{questions.error && (
					<p className="text-error font-semibold">{questions.error.message}</p>
				)}

				{deleteQuestion.error && (
					<p className="text-error font-semibold">
						{deleteQuestion.error instanceof Error
							? deleteQuestion.error.message
							: deleteQuestion.error.body.message}
					</p>
				)}

				<TriviaCardsTable
					onEdit={(question) => {
						setSelectedQuestion(question);
						setOpenModal("editor");
					}}
					isDeleting={deleteQuestion.isPending}
					isLoading={questions.isLoading}
					onDelete={handleDelete}
					onPreview={handlePreview}
					onRowClick={handlePreview}
					triviaCards={questions.data?.body ?? []}
				/>
			</section>
			<QuestionCardModal
				open={openModal === "editor"}
				question={selectedQuestion}
				setOpen={(open) => {
					if (!open) {
						setOpenModal(null);
					}
				}}
			/>
			<QuestionCardPreviewModal
				open={openModal === "preview"}
				question={selectedQuestion}
				setOpen={(open) => {
					if (!open) {
						setOpenModal(null);
					}
				}}
			/>
		</main>
	);
}
