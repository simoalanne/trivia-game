"use client";

import type { QuestionCard } from "@packages/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiClient } from "@/lib/apiClientProvider";
import {
	changeAnswerMode,
	createDefaultFormState,
	createFormStateFromQuestion,
	createFormStateFromQuestionInput,
	mapZodErrors,
	type QuestionCardFormState,
	validateQuestionCardForm,
} from "./questionCardFormUtils";

export function useQuestionCardForm(question?: QuestionCard | null) {
	const api = useApiClient();
	const createMutation = api.questionsCrud.create.useMutation();
	const editMutation = api.questionsCrud.update.useMutation();
	const initialFormState = useMemo(
		() =>
			question
				? createFormStateFromQuestion(question)
				: createDefaultFormState(),
		[question],
	);
	const [formState, setFormState] = useState(initialFormState);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitSucceeded, setSubmitSucceeded] = useState(false);
	const [isScanningImage, setIsScanningImage] = useState(false);

	useEffect(() => {
		setFormState(initialFormState);
		setErrors({});
		setSubmitError(null);
		setSubmitSucceeded(false);
	}, [initialFormState]);

	const onSubmit = async () => {
		const result = validateQuestionCardForm(formState);

		if (!result.success) {
			setErrors(mapZodErrors(formState));
			return null;
		}

		setErrors({});
		setSubmitError(null);
		setSubmitSucceeded(false);

		try {
			const savedQuestion = question
				? await editMutation.mutateAsync({
						...result.data,
						id: question.id,
					})
				: await createMutation.mutateAsync(result.data);

			api.questionsCrud.list.setData((current) => {
				if (!current) {
					return [savedQuestion];
				}

				if (question) {
					return current.map((currentQuestion) =>
						currentQuestion.id === savedQuestion.id
							? savedQuestion
							: currentQuestion,
					);
				}

				return [savedQuestion, ...current];
			});
			api.questionsCrud.getById.setData(
				{ id: savedQuestion.id },
				savedQuestion,
			);
			setSubmitSucceeded(true);
			return savedQuestion;
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "Failed to save trivia card",
			);
			return null;
		}
	};

	const onReset = useCallback(() => {
		setFormState(initialFormState);
		setErrors({});
		setSubmitError(null);
		setSubmitSucceeded(false);
	}, [initialFormState]);

	const scanImageToDraft = async (file: File) => {
		setIsScanningImage(true);

		try {
			const draft =
				await api.questionsCrud.convertImageToQuestionCardDraft.$fetch({
					rawBody: file,
				});

			setFormState(createFormStateFromQuestionInput(draft));
			setErrors({});
			setSubmitError(null);
			setSubmitSucceeded(false);
		} catch {
			// Intentionally swallow AI draft errors for now.
		} finally {
			setIsScanningImage(false);
		}
	};

	const setAnswerMode = (answerMode: QuestionCardFormState["answerMode"]) => {
		setFormState((current: QuestionCardFormState) =>
			changeAnswerMode(current, answerMode),
		);
		setErrors({});
		setSubmitError(null);
	};

	return {
		formState,
		setFormState,
		errors,
		setErrors,
		setAnswerMode,
		isScanningImage,
		isSubmitting: createMutation.isPending || editMutation.isPending,
		scanImageToDraft,
		submitError,
		submitSucceeded,
		onSubmit,
		onReset,
	};
}
