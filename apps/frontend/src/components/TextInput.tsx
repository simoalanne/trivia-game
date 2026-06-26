import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
	invalid?: boolean;
};

export function TextInput({ className, invalid, ...props }: TextInputProps) {
	return (
		<input
			aria-invalid={invalid || undefined}
			className={cn("input w-full", invalid && "input-error", className)}
			{...props}
		/>
	);
}
