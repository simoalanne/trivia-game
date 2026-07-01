import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { formatCountryDisplay } from "./countryDisplay";
import styles from "./TriviaCard.module.css";

export type TriviaCardItem = {
	id: string;
	label: string;
	answer?: string;
	answerUiHint?: "country";
	disabled?: boolean;
	variant?: "default" | "action";
};

type TriviaCardProps = {
	prompt: string;
	items: TriviaCardItem[];
	selectedItemId: string | null;
	onSelectedItemChange: (itemId: string | null) => void;
	readOnly?: boolean;
	showSelectedStyling?: boolean;
	centerHint?: string;
	concealUnselectedAnswers?: boolean;
	onCenterClick?: () => void;
};

const center = { x: 50, y: 50 };
const wheelGeometry = {
	questionRadius: 20,
	lineLength: 16,
	lineGap: 4,
};

const labelAnchorRadius =
	wheelGeometry.questionRadius +
	wheelGeometry.lineLength +
	wheelGeometry.lineGap;

function getRadialLayout(index: number, count: number) {
	const startAngle = -90;
	const radiusX = labelAnchorRadius;
	const radiusY = labelAnchorRadius;
	const maxWidth = 200;
	const safeCount = Math.max(count, 1);
	const angle = startAngle + index * (360 / safeCount);
	const radians = (angle * Math.PI) / 180;

	return {
		angle,
		maxWidth,
		itemTransform: getItemTransform(angle),
		spokeLength: wheelGeometry.lineLength,
		x: center.x + Math.cos(radians) * radiusX,
		y: center.y + Math.sin(radians) * radiusY,
	};
}

function getItemTransform(angle: number) {
	const normalized = ((angle % 360) + 360) % 360;

	if (normalized >= 250 && normalized <= 290) {
		return "translate(-50%, -100%)";
	}

	if (normalized >= 70 && normalized <= 110) {
		return "translate(-50%, 0)";
	}

	if (normalized > 290 || normalized < 70) {
		return "translate(0, -50%)";
	}

	if (normalized > 110 && normalized < 250) {
		return "translate(-100%, -50%)";
	}

	if (normalized > 180) {
		return "translate(-100%, -100%)";
	}

	return "translate(0, -100%)";
}

export function TriviaCard({
	prompt,
	items,
	selectedItemId,
	onSelectedItemChange,
	readOnly = false,
	showSelectedStyling = true,
	centerHint,
	concealUnselectedAnswers = false,
	onCenterClick,
}: TriviaCardProps) {
	const formatItemAnswer = (item: TriviaCardItem) =>
		item.answerUiHint === "country" && item.answer
			? formatCountryDisplay(item.answer)
			: item.answer;

	const centerContent = (
		<>
			<strong>{prompt}</strong>
			{centerHint ? (
				<span className={styles.questionHint}>{centerHint}</span>
			) : null}
		</>
	);

	return (
		<div className={styles.wheelArea}>
			<div
				className={styles.wheel}
				style={
					{
						"--question-size": `${wheelGeometry.questionRadius * 2}%`,
						"--spoke-start": `${wheelGeometry.questionRadius}%`,
					} as CSSProperties
				}
			>
				{items.map((item, index) => {
					const layout = getRadialLayout(index, items.length);

					return (
						<span
							key={`${item.id}-spoke`}
							className={styles.spoke}
							style={
								{
									"--angle": `${layout.angle}deg`,
									"--line": `${layout.spokeLength}%`,
								} as CSSProperties
							}
						/>
					);
				})}

				{onCenterClick && !readOnly ? (
					<button
						className={`${styles.question} ${styles.questionButton}`}
						onClick={onCenterClick}
						type="button"
					>
						{centerContent}
					</button>
				) : (
					<div className={styles.question}>{centerContent}</div>
				)}

				{items.map((item, index) => {
					const selected =
						item.variant !== "action" && item.id === selectedItemId;
					const showSelectedEffect = selected && showSelectedStyling;
					const selectedClassName = showSelectedEffect ? styles.selected : "";
					const hideAnswer =
						concealUnselectedAnswers && !selected && !item.disabled;
					const layout = getRadialLayout(index, items.length);

					const itemClassName = `${styles.item} ${selectedClassName} ${
						item.variant === "action" ? styles.itemAction : ""
					}`;
					const itemStyle = {
						"--x": `${layout.x}%`,
						"--y": `${layout.y}%`,
						"--item-max-width": `${layout.maxWidth}px`,
						"--item-transform": layout.itemTransform,
					} as CSSProperties;
					const itemLabelClassName = cn(
						styles.itemLabel,
						showSelectedEffect && "skeleton",
					);
					const itemAnswerClassName = cn(
						styles.itemAnswer,
						hideAnswer && styles.itemAnswerHidden,
						showSelectedEffect && hideAnswer && "skeleton",
					);
					const itemContent = (
						<>
							<span className={itemLabelClassName}>{item.label}</span>
							{formatItemAnswer(item) ? (
								<span className={itemAnswerClassName}>
									{formatItemAnswer(item)}
								</span>
							) : null}
						</>
					);

					if (readOnly) {
						return (
							<div key={item.id} className={itemClassName} style={itemStyle}>
								{itemContent}
							</div>
						);
					}

					return (
						<button
							disabled={item.disabled}
							key={item.id}
							className={itemClassName}
							style={itemStyle}
							onClick={() =>
								onSelectedItemChange(
									item.variant === "action"
										? item.id
										: selected
											? null
											: item.id,
								)
							}
							type="button"
						>
							{itemContent}
						</button>
					);
				})}
			</div>
		</div>
	);
}
