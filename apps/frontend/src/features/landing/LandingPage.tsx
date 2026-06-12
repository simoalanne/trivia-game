import Link from "next/link";
import { Button } from "@/components";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
	return (
		<main className={styles.page}>
			<section className={styles.hero} aria-labelledby="landing-title">
				<div className={styles.heroCopy}>
					<p className={styles.kicker}>Trivia night, minus the setup drag</p>
					<h1 id="landing-title">Start a room, gather players, play rounds.</h1>
					<p className={styles.summary}>
						A rough frontend shell for the TypeScript port. Game actions are
						placeholder-only for now so the layout and interaction model can
						settle first.
					</p>
					<div className={styles.actions}>
						<Link className={styles.primaryLink} href="/play">
							Create or join
						</Link>
						<Button variant="secondary">How it will work</Button>
					</div>
				</div>
				<div className={styles.preview} aria-hidden="true">
					<div className={styles.previewHeader}>
						<span>Round 01</span>
						<span>Lobby ready</span>
					</div>
					<div className={styles.questionBlock}>
						<p>Which planet has the most moons?</p>
						<div className={styles.answerRows}>
							<span>Saturn</span>
							<span>Jupiter</span>
							<span>Uranus</span>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
