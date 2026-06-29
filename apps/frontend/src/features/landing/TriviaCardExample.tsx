"use client";

import { useState } from "react";
import { TriviaCard, type TriviaCardItem } from "@/components";

const placeholderItems: TriviaCardItem[] = [
	{ id: "titan", label: "Titan", answer: "Saturn" },
	{ id: "io", label: "Io", answer: "Jupiter" },
	{ id: "triton", label: "Triton", answer: "Neptune" },
	{ id: "phobos", label: "Phobos", answer: "Mars" },
];

export function TriviaCardExample() {
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

	return (
		<TriviaCard
			concealUnselectedAnswers
			items={placeholderItems}
			onSelectedItemChange={setSelectedItemId}
			prompt="Match each moon to the planet it belongs to."
			selectedItemId={selectedItemId}
		/>
	);
}
