"use client";

import { useParams } from "next/navigation";
import ManageQuestionEditorPage from "@/features/manage-questions/ManageQuestionEditorPage";

export default function ManageQuestionsEditPage() {
	const params = useParams<{ id: string }>();
	const questionId = Number(params.id);

	return <ManageQuestionEditorPage mode="edit" questionId={questionId} />;
}
