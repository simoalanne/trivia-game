"use client";

import { type QuestionCard, questionImageSchema } from "@packages/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
	const { orpc, orpcClient } = useApiClient();
	const queryClient = useQueryClient();
	const createMutation = useMutation(
		orpc.questionsCrud.create.mutationOptions(),
	);
	const editMutation = useMutation(orpc.questionsCrud.update.mutationOptions());
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
			const savedQuestionResponse = question
				? await editMutation.mutateAsync({
						params: { id: question.id },
						body: result.data,
					})
				: await createMutation.mutateAsync({ body: result.data });
			const savedQuestion = savedQuestionResponse.body;

			queryClient.setQueryData(orpc.questionsCrud.list.queryKey(), (current) =>
				current
					? {
							...current,
							body: question
								? current.body.map((currentQuestion) =>
										currentQuestion.id === savedQuestion.id
											? savedQuestion
											: currentQuestion,
									)
								: [savedQuestion, ...current.body],
						}
					: current,
			);
			queryClient.setQueryData(
				orpc.questionsCrud.getById.queryKey({
					input: { params: { id: savedQuestion.id } },
				}),
				{ status: 200, body: savedQuestion },
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
				await orpcClient.questionsCrud.convertImageToQuestionCardDraft({
					body: { image: questionImageSchema.parse(file) },
				});

			setFormState(createFormStateFromQuestionInput(draft.body));
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
