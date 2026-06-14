"use client";

import type { QuestionCardInput } from "@packages/contracts";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components";
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
	const [importError, setImportError] = useState<string>();
	const [isImporting, setIsImporting] = useState(false);
	const [draftValue, setDraftValue] = useState<QuestionCardInput | null>(null);
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
			: (draftValue ?? createDefaultQuestionCard());

	const handleSubmit = (value: QuestionCardInput) => {
		if (mode === "edit" && hasValidQuestionId) {
			updateQuestion.mutate({ id: questionId, ...value });
			return;
		}

		createQuestion.mutate(value);
	};

	const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) {
			return;
		}

		setImportError(undefined);
		setIsImporting(true);

		try {
			const draft =
				await api.questionsCrud.convertImageToQuestionCardDraft.$fetch({
					rawBody: file,
				});
			setDraftValue(draft);
		} catch (error) {
			setImportError(
				error instanceof Error ? error.message : "Failed to analyze image",
			);
		} finally {
			setIsImporting(false);
		}
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
			{mode === "create" ? (
				<section
					className={styles.importPanel}
					aria-labelledby="image-import-title"
				>
					<div className={styles.importHeader}>
						<div>
							<h2 id="image-import-title">Draft From Card Image</h2>
							<p>
								Upload a JPEG or PNG card image and we&apos;ll ask the local
								Ollama model to build a reviewable draft.
							</p>
						</div>
						<label className={styles.uploadButton}>
							<input
								accept="image/jpeg,image/png"
								className={styles.uploadInput}
								disabled={isImporting}
								onChange={handleImageSelected}
								type="file"
							/>
							<span>{isImporting ? "Analyzing image..." : "Choose image"}</span>
						</label>
					</div>

					{isImporting ? (
						<p className={styles.statusMessage}>
							Generating a question draft from the uploaded card...
						</p>
					) : null}

					{importError ? (
						<p className={styles.errorMessage}>{importError}</p>
					) : null}

					{draftValue ? (
						<div className={styles.importActions}>
							<p className={styles.statusMessage}>
								Image draft loaded into the editor below. Review before saving.
							</p>
							<Button
								onClick={() => {
									setDraftValue(createDefaultQuestionCard());
									setImportError(undefined);
								}}
								size="sm"
								variant="secondary"
							>
								Reset draft
							</Button>
						</div>
					) : null}
				</section>
			) : null}

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
