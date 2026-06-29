// Notes for real implementation:
// - this modal should support getting default values which means if provided its in edit mode. if not its in create mode.
// - this modal can handle the api call to save the data then close the modal itself. this is cleaner than having parent handle
// api call since modal can for example then more easily show loading state and error state.
// - validation should be done on blur of inputs and on save. if validation fails, show error state and do not close modal. if validation passes, call api and close modal on success or show error state on failure.
// for validation we should use the contract we already know backend will use for validation.
// we dont need a form library since the form is not overly complex. simple form state object and then
// a helper that will get error states from zod validation result is enough. performance wise we
// can just validate full form on blur even if not all fields have cross field validation conserns.
// rerenders and performance are optimized if theres measurable performance issues we can optimize later. for now we can just use simple state and rerender on change.
// for when user changes question format we should for simplicity just clear entries to valid initial state.
// for errors prevent less text and more visual cues. simple red outline around problematic input is enough. when onblur is called again error should disappear if no longer present.
// error message should initially not be shown at all till we figure out a non cluttering way to show it and have it properly user friendly.

"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, Plus, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { CountryPicker, Modal, TagInput } from "@/components";
import { cn } from "@/lib/utils";

const initialMockTags = ["Sports", "Athletes", "Sport identification"];
const initialMockChoices = ["Football", "Basketball", "Tennis"];
// for when data comes from server and we no it will NOT come with ids we can instead use a counter ref to generate ids.
// crypto is simpler but has slight even if negligible performance impact. For mock data, this is fine.
const mockEntries = [
	{ id: crypto.randomUUID(), text: "Lionel Messi", answer: "Football" },
	{ id: crypto.randomUUID(), text: "LeBron James", answer: "Basketball" },
	{ id: crypto.randomUUID(), text: "Roger Federer", answer: "Tennis" },
	{ id: crypto.randomUUID(), text: "Cristiano Ronaldo", answer: "Football" },
	{
		id: crypto.randomUUID(),
		text: "Serena Williams",
		answer: "",
		invalid: true,
	},
	{ id: crypto.randomUUID(), text: "Stephen Curry", answer: "Basketball" },
];

export default function ManageQuestionsMockPage() {
	return (
		<main>
			<Modal
				footer={<MockFooter />}
				mobileSheet={false}
				open={true}
				setOpen={() => undefined}
				size="lg"
				title="Edit Trivia Card #123"
			>
				<MockEditorContent />
			</Modal>
		</main>
	);
}

type MockAnswerOption = {
	value: string;
	label: string;
};

function MockEditorContent() {
	const [tags, setTags] = useState(initialMockTags);
	const [choices, setChoices] = useState(initialMockChoices);
	const [entries, setEntries] = useState(mockEntries);

	return (
		<div className="grid gap-6 px-3 pb-2">
			<div className="grid gap-5">
				<fieldset className="fieldset">
					<legend className="fieldset-legend text-xl font-semibold">
						Card settings
					</legend>
					<label className="label px-0 pb-1 font-semibold text-base-content">
						Prompt
					</label>
					<textarea
						className="textarea  w-full"
						defaultValue="Which sport does the following athlete play: Football, Basketball, or Tennis?"
					/>
					<div className="text-right text-xs text-base-content/50">50/100</div>
				</fieldset>

				<div className="grid gap-4 xl:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,1fr)]">
					<fieldset className="fieldset min-w-0">
						<legend className="fieldset-legend text-sm font-semibold">
							Question format
						</legend>
						<select
							className="select select-sm w-full"
							defaultValue="Multiple choice"
						>
							<option>Multiple choice</option>
							<option>True or false</option>
							<option>Open ended</option>
							<option>Order items</option>
						</select>
					</fieldset>

					<fieldset className="fieldset">
						<legend className="fieldset-legend text-sm font-semibold">
							Difficulty
						</legend>
						<select className="select select-sm w-full" defaultValue="Easy">
							<option>Easy</option>
							<option>Medium</option>
							<option>Hard</option>
						</select>
					</fieldset>
					<fieldset className="fieldset">
						<legend className="fieldset-legend text-sm font-semibold">
							Answer hint
						</legend>
						<select
							className="select select-sm w-full"
							defaultValue="No hint"
							disabled={
								/* if question format is not open ended then there is no hint that can be provided. if format changes this can just be reset to no hint */ true
							}
						>
							<option>No hint</option>
							<option>Country</option>
						</select>
					</fieldset>

					<fieldset className="fieldset">
						<legend className="fieldset-legend text-sm font-semibold">
							Tags
						</legend>
						<TagInput
							onChange={setTags}
							placeholder="Type tag and press Enter"
							values={tags}
						/>
					</fieldset>
				</div>

				<fieldset className="fieldset min-w-0">
					<legend className="fieldset-legend text-sm font-semibold">
						Choices
					</legend>
					<TagInput
						maxItems={5}
						onChange={setChoices}
						placeholder="Type choice and press Enter"
						values={choices}
					/>
				</fieldset>
			</div>

			<div className="grid gap-4 pb-24">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-xl font-bold">Entries</h2>
					</div>
					<div className="flex items-center gap-2"></div>
				</div>

				<div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
					<table className="table table-sm">
						<colgroup>
							<col className="w-1/2" />
							<col className="w-1/2" />
						</colgroup>
						<thead>
							<tr>
								<th>Text</th>
								<th>Answer</th>
							</tr>
						</thead>
						<tbody>
							{entries.map((entry, index) => (
								<tr key={entry.id}>
									<td>
										<input
											className={`input input-sm w-full ${
												entry.invalid ? "input-error" : ""
											}`.trim()}
											defaultValue={entry.text}
											type="text"
										/>
									</td>
									<td>
										{/* in mock simulate multiple kind of pickers. we have select then we will have plain input and then a countrypicker existing primitive 
										for real implementation we will use select when we have a list of choices like true or false or order items or user provided choices. we will use input for open ended questions and we will use country picker for country questions.
										*/}
										{index % 3 === 0 ? (
											<MockAnswerPicker
												invalid={entry.invalid}
												options={choices}
												value={entry.answer}
											/>
										) : index % 3 === 1 ? (
											<input
												className={`input input-sm w-full ${
													entry.invalid ? "input-error" : ""
												}`.trim()}
												defaultValue={entry.answer}
												placeholder="Type answer"
											/>
										) : (
											<CountryPicker
												onChange={() => undefined}
												value={entry.answer}
											/>
										)}
									</td>
									<td>
										<button
											onClick={() => {
												if (entries.length <= 2) return;
												setEntries((prev) =>
													prev.filter((e) => e.id !== entry.id),
												);
											}}
											type="button"
										>
											<TrashIcon
												aria-label="Delete entry"
												className={cn(
													"size-4 text-base-content/60 transition-colors",
													entries.length <= 2 &&
														"opacity-50 hover:text-base-content/60 cursor-not-allowed",
													entries.length > 2 && "hover:text-error",
												)}
											/>
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div>
					<button
						className="btn btn-sm"
						type="button"
						onClick={() => {
							if (entries.length >= 10) return;
							setEntries((prev) => [
								...prev,
								{ id: crypto.randomUUID(), text: "", answer: "" },
							]);
						}}
					>
						<Plus size={16} />
						Add row
					</button>
				</div>
			</div>
		</div>
	);
}

function MockAnswerPicker({
	invalid = false,
	options,
	value,
}: {
	invalid?: boolean;
	options: string[];
	value: string;
}) {
	const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
	const normalizedOptions = useMemo<MockAnswerOption[]>(
		() => options.map((option) => ({ value: option, label: option })),
		[options],
	);

	const selectedOption =
		normalizedOptions.find((option) => option.value === value) ?? null;

	const portalContainer =
		(rootElement?.closest('[role="dialog"]') as HTMLElement | null) ??
		undefined;

	return (
		<div ref={setRootElement}>
			<ComboboxPrimitive.Root
				items={normalizedOptions}
				itemToStringLabel={(item) => item?.label ?? ""}
				onValueChange={() => undefined}
				value={selectedOption}
			>
				<ComboboxPrimitive.Trigger
					render={
						<button
							className={cn(
								"btn btn-sm w-full justify-between font-normal btn-outline",
								invalid && "border-error",
							)}
							type="button"
						>
							<span className="truncate text-left">
								{selectedOption?.label ?? "Pick answer"}
							</span>
							<ChevronDownIcon
								aria-hidden="true"
								className="size-4 shrink-0 text-base-content/60"
							/>
						</button>
					}
				></ComboboxPrimitive.Trigger>
				<ComboboxPrimitive.Portal container={portalContainer}>
					<ComboboxPrimitive.Positioner
						align="start"
						alignOffset={0}
						collisionAvoidance={{
							side: "shift",
							align: "shift",
							fallbackAxisSide: "none",
						}}
						side="bottom"
						sideOffset={6}
						className="isolate z-50"
					>
						<ComboboxPrimitive.Popup className="relative w-(--anchor-width) overflow-hidden rounded-(--radius-box) border border-base-300 bg-base-100 text-base-content shadow-xl">
							<ComboboxPrimitive.List className="max-h-72 overflow-y-auto p-1">
								{(item) => (
									<ComboboxPrimitive.Item
										key={item.value}
										value={item}
										className="relative flex w-full cursor-default items-center rounded-(--radius-field) px-3 py-2 text-sm outline-none select-none data-highlighted:bg-base-200"
									>
										<span className="truncate">{item.label}</span>
										<ComboboxPrimitive.ItemIndicator
											render={
												<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
											}
										>
											<CheckIcon aria-hidden="true" className="size-4" />
										</ComboboxPrimitive.ItemIndicator>
									</ComboboxPrimitive.Item>
								)}
							</ComboboxPrimitive.List>
						</ComboboxPrimitive.Popup>
					</ComboboxPrimitive.Positioner>
				</ComboboxPrimitive.Portal>
			</ComboboxPrimitive.Root>
		</div>
	);
}

function MockFooter() {
	return (
		<div className="flex w-full items-center justify-end gap-4">
			<button className="btn btn-md btn-error" type="button">
				Reset
			</button>
			<button className="btn btn-primary btn-md" type="button">
				Save changes
			</button>
		</div>
	);
}
