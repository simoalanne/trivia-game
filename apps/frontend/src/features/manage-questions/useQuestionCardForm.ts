"use client";

import type { QuestionCard } from "@packages/contracts";
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
	const { client, tq } = useApiClient();
	const queryClient = useQueryClient();
	const createMutation = useMutation(tq.questionsCrud.create.mutationOptions());
	const editMutation = useMutation(tq.questionsCrud.update.mutationOptions());
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
						...result.data,
						id: question.id,
					})
				: await createMutation.mutateAsync(result.data);
			const savedQuestion = savedQuestionResponse.body;

			queryClient.setQueryData(tq.questionsCrud.list.getKey(), (current) =>
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
				tq.questionsCrud.getById.getKey({ id: savedQuestion.id }),
				{
					body: savedQuestion,
					headers: new Headers(),
					status: 200,
				},
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
			const contentType =
				file.type === "image/png" ? "image/png" : "image/jpeg";
			const draft =
				await client.questionsCrud.convertImageToQuestionCardDraft.fetch({
					body: {
						contentType,
						payload: new Uint8Array(await file.arrayBuffer()),
					},
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
