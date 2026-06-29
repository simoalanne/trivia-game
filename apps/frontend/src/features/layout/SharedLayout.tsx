import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApiClientProvider } from "@/lib/apiClientProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

type SharedLayoutProps = Readonly<{
	children: ReactNode;
}>;

export default function SharedLayout({ children }: SharedLayoutProps) {
	return (
		<html
			lang="en"
			data-theme="cupcake"
			className={`${geistSans.variable} ${geistMono.variable}`}
		>
			<body>
				<ApiClientProvider>
					<header className="bg-success flex h-16 items-center justify-between px-4 shadow-sm">
						<Link className="link-hover text-base-100" href="/">
							TriviaGame
						</Link>
						<Link className="link-hover text-base-100" href="/manage-questions">
							Manage questions
						</Link>
					</header>
					{children}
				</ApiClientProvider>
			</body>
		</html>
	);
}
