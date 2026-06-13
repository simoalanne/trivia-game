import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApiClientProvider } from "@/lib/apiClientProvider";
import styles from "./SharedLayout.module.css";

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
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body>
				<ApiClientProvider>
					<div className={styles.shell}>
						<header className={styles.header}>
							<Link className={styles.brand} href="/">
								TriviaGame
							</Link>
							<nav className={styles.nav} aria-label="Primary">
								<Link className={styles.navLink} href="/manage-questions">
									Manage questions
								</Link>
							</nav>
						</header>
						{children}
					</div>
				</ApiClientProvider>
			</body>
		</html>
	);
}
