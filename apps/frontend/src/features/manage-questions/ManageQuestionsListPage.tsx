"use client";

import type { QuestionCard } from "@packages/contracts";
import Link from "next/link";
import { Button } from "@/components";
import { useApiClient } from "@/lib/apiClientProvider";
import styles from "./ManageQuestionsListPage.module.css";

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
		<main className={styles.page}>
			<section
				className={styles.panel}
				aria-labelledby="manage-questions-title"
			>
				<div className={styles.header}>
					<div>
						<h1 id="manage-questions-title">Manage question cards</h1>
						<p>Add and maintain the trivia cards that power live gameplay.</p>
					</div>
					<Link className={styles.primaryLink} href="/manage-questions/create">
						Create question
					</Link>
				</div>

				{questions.isLoading ? (
					<p className={styles.statusMessage}>Loading questions...</p>
				) : null}

				{questions.error ? (
					<p className={styles.errorMessage}>{questions.error.message}</p>
				) : null}

				{deleteQuestion.error ? (
					<p className={styles.errorMessage}>{deleteQuestion.error.message}</p>
				) : null}

				{questions.data?.length ? (
					<div className={styles.grid}>
						{questions.data.map((question) => (
							<article className={styles.card} key={question.id}>
								<div className={styles.cardHeader}>
									<span className={styles.badge}>{question.difficulty}</span>
									<span className={styles.badgeMuted}>
										{questionTypeLabels[question.format]}
									</span>
								</div>
								<h2>{question.prompt}</h2>
								<p className={styles.meta}>
									{question.entries.length} entries
									{question.format === "MULTIPLE_CHOICE"
										? ` • ${question.choices.length} choices`
										: ""}
								</p>
								<div className={styles.tags}>
									{question.tags.length ? (
										question.tags.map((tag) => (
											<span
												className={styles.tag}
												key={`${question.id}-${tag}`}
											>
												{tag}
											</span>
										))
									) : (
										<span className={styles.tagMuted}>No tags</span>
									)}
								</div>
								<div className={styles.actions}>
									<Link
										className={styles.secondaryLink}
										href={`/manage-questions/edit/${question.id}`}
									>
										Edit
									</Link>
									<Button
										disabled={deleteQuestion.isPending}
										onClick={() => handleDelete(question)}
										size="sm"
										variant="danger"
									>
										Delete
									</Button>
								</div>
							</article>
						))}
					</div>
				) : questions.isLoading ? null : (
					<div className={styles.emptyState}>
						<p>No question cards yet.</p>
						<Link
							className={styles.primaryLink}
							href="/manage-questions/create"
						>
							Create the first one
						</Link>
					</div>
				)}
			</section>
		</main>
	);
}
