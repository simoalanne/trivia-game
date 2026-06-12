import type { ReactNode } from "react";
import styles from "./Field.module.css";

type FieldProps = {
	children: ReactNode;
	description?: ReactNode;
	error?: ReactNode;
	htmlFor?: string;
	label: ReactNode;
};

export function Field({
	children,
	description,
	error,
	htmlFor,
	label,
}: FieldProps) {
	return (
		<div className={styles.field}>
			<label className={styles.fieldLabel} htmlFor={htmlFor}>
				{label}
			</label>
			{children}
			{description ? (
				<p className={styles.fieldDescription}>{description}</p>
			) : null}
			{error ? <p className={styles.fieldError}>{error}</p> : null}
		</div>
	);
}
