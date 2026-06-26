import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon-xs" | "icon-sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

const variantClassNames: Record<ButtonVariant, string> = {
	primary: "btn-primary",
	secondary: "",
	ghost: "btn-ghost",
	danger: "btn-error",
	outline: "btn-outline",
};

const sizeClassNames: Record<ButtonSize, string> = {
	sm: "btn-sm",
	md: "",
	lg: "btn-lg",
	"icon-xs": "h-8 min-h-8 w-8 p-0",
	"icon-sm": "h-10 min-h-10 w-10 p-0",
};

export function Button({
	className,
	type = "button",
	variant = "primary",
	size = "md",
	...props
}: ButtonProps) {
	return (
		<button
			className={cn(
				"btn",
				variantClassNames[variant],
				sizeClassNames[size],
				className,
			)}
			type={type}
			{...props}
		/>
	);
}
