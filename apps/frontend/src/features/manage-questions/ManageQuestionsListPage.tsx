"use client";

import type { QuestionCard } from "@packages/contracts";
import Link from "next/link";
import { useApiClient } from "@/lib/apiClientProvider";

const questionTypeLabels: Record<QuestionCard["format"], string> = {
	MULTIPLE_CHOICE: "Multiple choice",
	TRUE_OR_FALSE: "True or false",
	OPEN_ENDED: "Open ended",
	ORDER_ITEMS: "Order items",
};

export default function ManageQuestionsListPage() {
	const api = useApiClient();
	const questions = api.questionsCrud.list.useQuery();
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
		<main className="px-4 py-8 sm:px-8 lg:px-12">
			<section
				className="mx-auto grid max-w-6xl gap-6"
				aria-labelledby="manage-questions-title"
			>
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
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
					<Link className="btn btn-primary" href="/manage-questions/create">
						Create question
					</Link>
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

				{questions.data?.length ? (
					<div className="grid grid-cols-[repeat(auto-fit,minmax(17rem,1fr))] gap-4">
						{questions.data.map((question) => (
							<article
								className="card card-border bg-base-100"
								key={question.id}
							>
								<div className="card-body gap-4">
									<div className="flex flex-wrap gap-2">
										<span className="badge badge-primary badge-soft">
											{question.difficulty}
										</span>
										<span className="badge badge-ghost">
											{questionTypeLabels[question.format]}
										</span>
									</div>
									<h2 className="card-title text-lg">{question.prompt}</h2>
									<p className="text-base-content/70">
										{question.entries.length} entries
										{question.format === "MULTIPLE_CHOICE"
											? ` • ${question.choices.length} choices`
											: ""}
									</p>
									<div className="flex flex-wrap gap-2">
										{question.tags.length ? (
											question.tags.map((tag) => (
												<span className="badge" key={`${question.id}-${tag}`}>
													{tag}
												</span>
											))
										) : (
											<span className="badge badge-ghost">No tags</span>
										)}
									</div>
									<div className="card-actions">
										<Link
											className="btn btn-sm"
											href={`/manage-questions/edit/${question.id}`}
										>
											Edit
										</Link>
										<button
											className="btn btn-error btn-sm"
											disabled={deleteQuestion.isPending}
											onClick={() => handleDelete(question)}
											type="button"
										>
											Delete
										</button>
									</div>
								</div>
							</article>
						))}
					</div>
				) : questions.isLoading ? null : (
					<div className="card card-dash bg-base-100">
						<div className="card-body items-start gap-3">
							<p className="text-base-content/70">No question cards yet.</p>
							<Link className="btn btn-primary" href="/manage-questions/create">
								Create the first one
							</Link>
						</div>
					</div>
				)}
			</section>
		</main>
	);
}
