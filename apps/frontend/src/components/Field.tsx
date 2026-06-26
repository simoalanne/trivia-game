import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
		<div className="fieldset w-full gap-2">
			<label
				className="fieldset-legend text-sm font-semibold"
				htmlFor={htmlFor}
			>
				{label}
			</label>
			{children}
			{description ? (
				<p className="label px-0 text-sm text-base-content/70">{description}</p>
			) : null}
			{error ? (
				<p className={cn("label px-0 text-sm font-semibold text-error")}>
					{error}
				</p>
			) : null}
		</div>
	);
}
