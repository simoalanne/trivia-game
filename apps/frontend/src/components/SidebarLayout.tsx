"use client";

import { MenuIcon, XIcon } from "lucide-react";
import { Dialog, VisuallyHidden } from "radix-ui";
import type { ReactNode } from "react";

type SidebarLayoutProps = {
	children: ReactNode;
	mobileOpen: boolean;
	onMobileOpenChange: (open: boolean) => void;
	sidebar: ReactNode;
	title: string;
	triggerLabel?: string;
};

export function SidebarLayout({
	children,
	mobileOpen,
	onMobileOpenChange,
	sidebar,
	title,
	triggerLabel = "Open sidebar",
}: SidebarLayoutProps) {
	return (
		<div className="relative h-[calc(100dvh-4rem)] overflow-hidden lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
			<aside className="border-base-300 bg-base-100 hidden h-full overflow-y-auto border-r lg:block">
				{sidebar}
			</aside>

			<Dialog.Root onOpenChange={onMobileOpenChange} open={mobileOpen}>
				<Dialog.Trigger asChild>
					<button
						className="btn btn-square btn-sm btn-ghost absolute top-4 left-4 z-40 lg:hidden"
						type="button"
					>
						<MenuIcon aria-hidden="true" className="size-4" />
						<VisuallyHidden.Root>{triggerLabel}</VisuallyHidden.Root>
					</button>
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed top-16 right-0 bottom-0 left-0 z-50 bg-neutral/40 lg:hidden" />
					<Dialog.Content
						aria-describedby={undefined}
						className="bg-base-100 fixed top-16 bottom-0 left-0 z-51 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto border-r border-base-300 outline-none lg:hidden"
					>
						<Dialog.Title asChild>
							<VisuallyHidden.Root>{title}</VisuallyHidden.Root>
						</Dialog.Title>
						<Dialog.Close
							className="btn btn-square btn-sm btn-ghost absolute top-4 right-4"
							type="button"
						>
							<XIcon aria-hidden="true" className="size-4" />
							<VisuallyHidden.Root>Close sidebar</VisuallyHidden.Root>
						</Dialog.Close>
						<div className="pt-14">{sidebar}</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			<div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
		</div>
	);
}
