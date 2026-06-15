import { VisuallyHidden } from "radix-ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Sheet.module.css";

type SheetIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	icon: ReactNode;
	label: string;
	variant?: "default" | "danger";
};

export function SheetIconButton({
	icon,
	label,
	type = "button",
	variant = "default",
	className,
	...props
}: SheetIconButtonProps) {
	return (
		<button
			className={`${styles.closeButton} ${
				variant === "danger" ? styles.iconButtonDanger : ""
			} ${className ?? ""}`.trim()}
			type={type}
			{...props}
		>
			<span aria-hidden="true" className={styles.iconButtonGlyph}>
				{icon}
			</span>
			<VisuallyHidden.Root>{label}</VisuallyHidden.Root>
		</button>
	);
}
