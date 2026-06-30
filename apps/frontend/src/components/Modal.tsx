"use client";

import { Dialog, VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";
import styles from "./Modal.module.css";

export type ModalProps = {
	open: boolean;
	setOpen: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	content?: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;
	leadingIcon?: ReactNode;
	size?: "md" | "lg";
	mobileSheet?: boolean;
	showCloseButton?: boolean;
	dismissible?: boolean;
};

export function Modal({
	open,
	setOpen,
	title,
	description,
	content,
	children,
	footer,
	leadingIcon,
	size = "md",
	mobileSheet = true,
	showCloseButton = true,
	dismissible = true,
}: ModalProps) {
	const resolvedContent = children ?? content;

	return (
		<Dialog.Root modal={true} onOpenChange={setOpen} open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className={styles.overlay} />
				<Dialog.Content
					aria-describedby={undefined}
					className={`${styles.content} ${
						size === "lg" ? styles.contentSizeLg : styles.contentSizeMd
					} ${mobileSheet ? styles.contentMobileSheet : ""}`.trim()}
					onEscapeKeyDown={(event) => {
						if (!dismissible) {
							event.preventDefault();
						}
					}}
					onInteractOutside={(event) => {
						if (!dismissible) {
							event.preventDefault();
						}
					}}
				>
					<div
						className={`${styles.header} ${
							leadingIcon ? styles.headerWithLeadingIcon : ""
						}`.trim()}
					>
						{leadingIcon ? (
							<div className={styles.leadingIcon}>{leadingIcon}</div>
						) : null}
						<div className={styles.titleBlock}>
							<Dialog.Title
								className={`${styles.title} ${
									leadingIcon ? styles.titleCentered : ""
								}`.trim()}
							>
								{title}
							</Dialog.Title>
							{description ? (
								<Dialog.Description className={styles.description}>
									{description}
								</Dialog.Description>
							) : null}
						</div>
						{showCloseButton ? (
							<Dialog.Close className={styles.closeButton} type="button">
								<span aria-hidden="true">&times;</span>
								<VisuallyHidden.Root>Close</VisuallyHidden.Root>
							</Dialog.Close>
						) : null}
					</div>
					<div className={styles.body}>{resolvedContent}</div>
					{footer ? <div className={styles.footer}>{footer}</div> : null}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
