import type { InputHTMLAttributes } from "react";
import styles from "./TextInput.module.css";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
	invalid?: boolean;
};

const cx = (...classNames: Array<string | undefined | false>) =>
	classNames.filter(Boolean).join(" ");

export function TextInput({ className, invalid, ...props }: TextInputProps) {
	return (
		<input
			aria-invalid={invalid || undefined}
			className={cx(
				styles.control,
				invalid && styles.controlInvalid,
				className,
			)}
			{...props}
		/>
	);
}
