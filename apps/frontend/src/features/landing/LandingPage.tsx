import Link from "next/link";
import { Button } from "@/components";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
	return (
		<main className={styles.page}>
			<section className={styles.hero} aria-labelledby="landing-title">
				<div className={styles.heroCopy}>
					<p className={styles.kicker}>Fresh take from classic trivia</p>
					<h1 id="landing-title">
						Start a room, gather players, and start playing!
					</h1>
					<p className={styles.summary}>
						TriviaGame is a real-time multiplayer trivia game built with Next.js
						and TypeScript. It features a custom game engine, WebSocket-based
						communication, and a simple obviously vibecoded UI.
					</p>
					<div className={styles.actions}>
						<Link className={styles.primaryLink} href="/play">
							Start playing
						</Link>
						<Button variant="secondary">How it works</Button>
					</div>
				</div>
				<div className={styles.preview} aria-hidden="true">
					<div className={styles.previewHeader}>
						<p className={styles.previewKicker}>Game N7Q4</p>
						<h2>Round 67</h2>
					</div>
					<div className={styles.previewScoreboard}>
						<div
							className={`${styles.previewPlayerScore} ${styles.previewCurrentPlayer}`}
						>
							<strong>You</strong>
							<span>67</span>
						</div>
						<div
							className={`${styles.previewPlayerScore} ${styles.previewCurrentTurn}`}
						>
							<strong>Sam</strong>
							<span>67</span>
						</div>
						<div className={styles.previewPlayerScore}>
							<strong>Lee</strong>
							<span>67</span>
						</div>
					</div>
					<div className={styles.previewRound}>
						<p className={styles.previewPrompt}>
							Match each moon to the planet it belongs to.
						</p>
						<div className={styles.previewEntriesGrid}>
							<article className={styles.previewEntryCard}>
								<h3>Titan</h3>
								<div className={styles.previewAnswerSummary}>
									<span>Saturn</span>
									<strong className={styles.previewCorrectAnswer}>
										Correct
									</strong>
								</div>
							</article>
							<article className={styles.previewEntryCard}>
								<h3>Io</h3>
								<div className={styles.previewSelect}>Select answer</div>
								<div className={styles.previewButton}>Submit answer</div>
							</article>
							<article className={styles.previewEntryCard}>
								<h3>Triton</h3>
								<div className={styles.previewSelect}>Select answer</div>
								<div className={styles.previewButton}>Submit answer</div>
							</article>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
