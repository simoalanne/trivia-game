import type { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
	invalid?: boolean;
};

const cx = (...classNames: Array<string | undefined | false>) =>
	classNames.filter(Boolean).join(" ");

export function Select({ className, invalid, ...props }: SelectProps) {
	return (
		<select
			aria-invalid={invalid || undefined}
			className={cx(
				styles.control,
				styles.select,
				invalid && styles.controlInvalid,
				className,
			)}
			{...props}
		/>
	);
}
