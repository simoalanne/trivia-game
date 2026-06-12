import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

const variantClassNames: Record<ButtonVariant, string> = {
	primary: styles.buttonPrimary,
	secondary: styles.buttonSecondary,
	ghost: styles.buttonGhost,
	danger: styles.buttonDanger,
};

const sizeClassNames: Record<ButtonSize, string> = {
	sm: styles.buttonSmall,
	md: styles.buttonMedium,
	lg: styles.buttonLarge,
};

const cx = (...classNames: Array<string | undefined>) =>
	classNames.filter(Boolean).join(" ");

export function Button({
	className,
	type = "button",
	variant = "primary",
	size = "md",
	...props
}: ButtonProps) {
	return (
		<button
			className={cx(
				styles.button,
				variantClassNames[variant],
				sizeClassNames[size],
				className,
			)}
			type={type}
			{...props}
		/>
	);
}
