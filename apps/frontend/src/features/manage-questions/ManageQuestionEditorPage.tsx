"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/apiClientProvider";
import styles from "./ManageQuestionEditorPage.module.css";
import QuestionForm from "./QuestionForm";
import {
	createEmptyQuestionCard,
	toQuestionCardInput,
} from "./questionFormData";

type ManageQuestionEditorPageProps = {
	mode: "create" | "edit";
	questionId?: number;
};

const createDefaultQuestionCard = (): QuestionCardInput =>
	createEmptyQuestionCard("MULTIPLE_CHOICE");

export default function ManageQuestionEditorPage({
	mode,
	questionId,
}: ManageQuestionEditorPageProps) {
	const api = useApiClient();
	const router = useRouter();
	const hasValidQuestionId =
		typeof questionId === "number" && !Number.isNaN(questionId);
	const questionQuery = api.questionsCrud.getById.useQuery(
		mode === "edit" && hasValidQuestionId ? { id: questionId } : "",
	);

	const createQuestion = api.questionsCrud.create.useMutation({
		onSuccess: (createdQuestion) => {
			api.questionsCrud.list.setData((current) =>
				current ? [createdQuestion, ...current] : [createdQuestion],
			);
			router.push("/manage-questions");
		},
	});

	const updateQuestion = api.questionsCrud.update.useMutation({
		onSuccess: (updatedQuestion) => {
			api.questionsCrud.list.setData(
				(current) =>
					current?.map((question) =>
						question.id === updatedQuestion.id ? updatedQuestion : question,
					) ?? [updatedQuestion],
			);
			api.questionsCrud.getById.setData(
				{ id: updatedQuestion.id },
				() => updatedQuestion,
			);
			router.push("/manage-questions");
		},
	});

	const initialValue =
		mode === "edit" && questionQuery.data
			? toQuestionCardInput(questionQuery.data)
			: createDefaultQuestionCard();

	const handleSubmit = (value: QuestionCardInput) => {
		if (mode === "edit" && hasValidQuestionId) {
			updateQuestion.mutate({ id: questionId, ...value });
			return;
		}

		createQuestion.mutate(value);
	};

	if (mode === "edit" && !hasValidQuestionId) {
		return (
			<main className={styles.page}>
				<p className={styles.errorMessage}>Question id is invalid.</p>
			</main>
		);
	}

	if (mode === "edit" && questionQuery.isLoading) {
		return (
			<main className={styles.page}>
				<p className={styles.statusMessage}>Loading question...</p>
			</main>
		);
	}

	if (mode === "edit" && questionQuery.error) {
		return (
			<main className={styles.page}>
				<p className={styles.errorMessage}>{questionQuery.error.message}</p>
			</main>
		);
	}

	return (
		<main className={styles.page}>
			<QuestionForm
				cancelHref="/manage-questions"
				initialValue={initialValue}
				isSubmitting={createQuestion.isPending || updateQuestion.isPending}
				mode={mode}
				onSubmit={handleSubmit}
				submitError={
					createQuestion.error?.message ?? updateQuestion.error?.message
				}
			/>
		</main>
	);
}
