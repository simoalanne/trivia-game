"use client";

import type { QuestionCard } from "@packages/contracts";
import { Eye, PencilIcon, Trash2 } from "lucide-react";
import { useDeferredValue, useState } from "react";

type TriviaCardsTableProps = {
	triviaCards: QuestionCard[];
	isDeleting?: boolean;
	onDelete: (triviaCard: QuestionCard) => void;
	onEdit: (triviaCard: QuestionCard) => void;
	onPreview: (triviaCard: QuestionCard) => void;
};

const TRIVIA_CARDS_PER_PAGE = 10;

const answerModeLabels: Record<QuestionCard["answerMode"], string> = {
	TEXT: "Text",
	CHOICES: "Choices",
	COUNTRY: "Country",
};

const difficultyBadgeClassNames: Record<QuestionCard["difficulty"], string> = {
	EASY: "badge badge-success badge-soft",
	MEDIUM: "badge badge-warning badge-soft",
	HARD: "badge badge-error badge-soft",
};

const difficultyLabels: Record<QuestionCard["difficulty"], string> = {
	EASY: "Easy",
	MEDIUM: "Medium",
	HARD: "Hard",
};

const answerModeBadgeClassNames: Record<QuestionCard["answerMode"], string> = {
	TEXT: "badge badge-info badge-soft",
	CHOICES: "badge badge-primary badge-soft",
	COUNTRY: "badge badge-secondary badge-soft",
};

const updatedAtFormatter = new Intl.DateTimeFormat("en-GB", {
	dateStyle: "medium",
	timeStyle: "short",
});

export default function TriviaCardsTable({
	triviaCards,
	isDeleting = false,
	onEdit,
	onDelete,
	onPreview,
}: TriviaCardsTableProps) {
	const [promptSearch, setPromptSearch] = useState("");
	const [page, setPage] = useState(1);
	const deferredPromptSearch = useDeferredValue(promptSearch);

	const normalizedPromptSearch = deferredPromptSearch.trim().toLowerCase();
	const filteredTriviaCards = triviaCards.filter((triviaCard) =>
		triviaCard.prompt.toLowerCase().includes(normalizedPromptSearch),
	);
	const totalPages = Math.max(
		1,
		Math.ceil(filteredTriviaCards.length / TRIVIA_CARDS_PER_PAGE),
	);
	const currentPage = Math.min(page, totalPages);
	const startIndex = (currentPage - 1) * TRIVIA_CARDS_PER_PAGE;
	const paginatedTriviaCards = filteredTriviaCards.slice(
		startIndex,
		startIndex + TRIVIA_CARDS_PER_PAGE,
	);
	const pageStart = filteredTriviaCards.length ? startIndex + 1 : 0;
	const pageEnd = filteredTriviaCards.length
		? Math.min(startIndex + TRIVIA_CARDS_PER_PAGE, filteredTriviaCards.length)
		: 0;

	const pageButtons = Array.from(
		{ length: totalPages },
		(_, index) => index + 1,
	).filter((pageNumber) => Math.abs(pageNumber - currentPage) <= 1);

	return (
		<div className="card card-border min-w-0 max-w-full bg-base-200 shadow-sm">
			<div className="card-body gap-4 border-b border-base-300 bg-base-200/60">
				<fieldset className="fieldset min-w-0 w-full sm:max-w-md">
					<legend className="fieldset-legend">Search by prompt</legend>
					<input
						className="input w-full"
						onChange={(event) => {
							setPromptSearch(event.target.value);
							setPage(1);
						}}
						placeholder="Type to filter trivia cards"
						type="text"
						value={promptSearch}
					/>
				</fieldset>
			</div>

			<div className="min-w-0 max-w-full overflow-x-auto overflow-y-auto h-[min(60vh,36rem)] bg-base-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
				<table className="table table-pin-rows min-w-max">
					<thead>
						<tr>
							<th scope="col">Id</th>
							<th scope="col">Prompt</th>
							<th scope="col">Difficulty</th>
							<th scope="col">Answer mode</th>
							<th scope="col">Entries</th>
							<th scope="col">Updated</th>
							<th scope="col" className="w-1 whitespace-nowrap">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{paginatedTriviaCards.length ? (
							paginatedTriviaCards.map((triviaCard) => (
								<tr
									key={triviaCard.id}
									className="cursor-pointer hover:bg-base-200/70"
									onClick={() => {
										onPreview(triviaCard);
									}}
								>
									<td className="whitespace-nowrap font-medium">
										{triviaCard.id}
									</td>
									<td className="min-w-48 sm:min-w-64">
										<p className="line-clamp-2 text-sm font-medium">
											{triviaCard.prompt}
										</p>
									</td>
									<td className="whitespace-nowrap">
										<span
											className={
												difficultyBadgeClassNames[triviaCard.difficulty]
											}
										>
											{difficultyLabels[triviaCard.difficulty]}
										</span>
									</td>
									<td className="whitespace-nowrap">
										<span
											className={
												answerModeBadgeClassNames[triviaCard.answerMode]
											}
										>
											{answerModeLabels[triviaCard.answerMode]}
										</span>
									</td>
									<td className="whitespace-nowrap">
										{triviaCard.entries.length}
									</td>
									<td className="whitespace-nowrap text-sm text-base-content/70">
										{updatedAtFormatter.format(new Date(triviaCard.updatedAt))}
									</td>
									<td>
										<div className="flex justify-end gap-2">
											<button
												aria-label={`Preview trivia card ${triviaCard.id}`}
												className="btn btn-sm btn-ghost btn-square"
												onClick={(event) => {
													event.stopPropagation();
													onPreview(triviaCard);
												}}
												type="button"
											>
												<Eye aria-hidden="true" className="size-4" />
											</button>
											<button
												aria-label={`Edit trivia card ${triviaCard.id}`}
												className="btn btn-sm btn-ghost btn-square"
												onClick={(event) => {
													event.stopPropagation();
													onEdit(triviaCard);
												}}
												type="button"
											>
												<PencilIcon aria-hidden="true" className="size-4" />
											</button>
											<button
												aria-label={`Delete trivia card ${triviaCard.id}`}
												className="btn btn-sm btn-ghost btn-square"
												disabled={isDeleting}
												onClick={(event) => {
													event.stopPropagation();
													onDelete(triviaCard);
												}}
												type="button"
											>
												<Trash2
													aria-hidden="true"
													className="size-4 text-error"
												/>
											</button>
										</div>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td
									className="py-10 text-center text-base text-base-content/70"
									colSpan={7}
								>
									No Trivia cards found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="flex flex-col gap-3 border-t border-base-300 bg-base-200/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-base-content/70">
					Showing {pageStart}-{pageEnd} of {filteredTriviaCards.length}
				</p>
				<div className="join self-start sm:self-auto">
					<button
						className="btn btn-sm join-item"
						disabled={currentPage === 1}
						onClick={() => {
							setPage((currentPage) => Math.max(1, currentPage - 1));
						}}
						type="button"
					>
						{"<"}
					</button>
					{pageButtons.map((pageNumber) => (
						<button
							key={pageNumber}
							className={`btn btn-sm join-item ${pageNumber === currentPage ? "btn-active" : ""}`}
							onClick={() => {
								setPage(pageNumber);
							}}
							type="button"
						>
							{pageNumber}
						</button>
					))}
					<button
						className="btn btn-sm join-item"
						disabled={currentPage === totalPages}
						onClick={() => {
							setPage((currentPage) => Math.min(totalPages, currentPage + 1));
						}}
						type="button"
					>
						{">"}
					</button>
				</div>
			</div>
		</div>
	);
}
