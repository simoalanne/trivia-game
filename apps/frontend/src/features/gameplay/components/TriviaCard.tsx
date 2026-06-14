import type { CSSProperties } from "react";
import styles from "./TriviaCard.module.css";

export type TriviaCardItem = {
	id: string;
	label: string;
	answer?: string;
	disabled?: boolean;
};

type TriviaCardProps = {
	prompt: string;
	items: TriviaCardItem[];
	selectedItemId: string | null;
	onSelectedItemChange: (itemId: string | null) => void;
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
	const angle = startAngle + index * (360 / count);
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
}: TriviaCardProps) {
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

				<div className={styles.question}>
					<strong>{prompt}</strong>
				</div>

				{items.map((item, index) => {
					const selected = item.id === selectedItemId;
					const hideAnswer = !selected && !item.disabled;
					const layout = getRadialLayout(index, items.length);

					return (
						<button
							disabled={item.disabled}
							key={item.id}
							className={`${styles.item} ${selected ? styles.selected : ""}`}
							style={
								{
									"--x": `${layout.x}%`,
									"--y": `${layout.y}%`,
									"--item-max-width": `${layout.maxWidth}px`,
									"--item-transform": layout.itemTransform,
								} as CSSProperties
							}
							onClick={() => onSelectedItemChange(selected ? null : item.id)}
							type="button"
						>
							<span className={styles.itemLabel}>{item.label}</span>
							{item.answer ? (
								<span
									className={`${styles.itemAnswer} ${
										hideAnswer ? styles.itemAnswerHidden : ""
									}`}
								>
									{item.answer}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
