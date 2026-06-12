import Link from "next/link";
import styles from "./GameSessionNotFoundPage.module.css";

export default function GameSessionNotFoundPage() {
	return (
		<main className={styles.page}>
			<section className={styles.panel}>
				<p className={styles.kicker}>Game unavailable</p>
				<h1>Could not find that game session.</h1>
				<p>
					The room may have expired, the player session may no longer be valid,
					or the code might be wrong.
				</p>
				<Link className={styles.link} href="/play">
					Create or join another game
				</Link>
			</section>
		</main>
	);
}
