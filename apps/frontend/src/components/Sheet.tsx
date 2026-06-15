"use client";

import { Dialog, VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";
import styles from "./Sheet.module.css";

type SheetProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	title: string;
	content: ReactNode;
	footer?: ReactNode;
	leadingIcon?: ReactNode;
};

export function Sheet({
	open,
	setOpen,
	title,
	content,
	footer,
	leadingIcon,
}: SheetProps) {
	return (
		<Dialog.Root modal={true} onOpenChange={setOpen} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className={styles.overlay} />
				<Dialog.Content aria-describedby={undefined} className={styles.content}>
					<div
						className={`${styles.header} ${
							leadingIcon ? styles.headerWithLeadingIcon : ""
						}`}
					>
						{leadingIcon ? (
							<div className={styles.leadingIcon}>{leadingIcon}</div>
						) : null}
						<Dialog.Title
							className={`${styles.title} ${
								leadingIcon ? styles.titleCentered : ""
							}`}
						>
							{title}
						</Dialog.Title>
						<Dialog.Close className={styles.closeButton} type="button">
							<span aria-hidden="true">&times;</span>
							<VisuallyHidden.Root>Close</VisuallyHidden.Root>
						</Dialog.Close>
					</div>
					<div className={styles.body}>{content}</div>
					{footer ? <div className={styles.footer}>{footer}</div> : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
