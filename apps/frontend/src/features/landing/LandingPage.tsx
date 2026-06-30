import Link from "next/link";
import { TriviaCardExample } from "./TriviaCardExample";

export default function LandingPage() {
	return (
		<main className="mt-10">
			<section
				className="grid gap-5 text-center"
				aria-labelledby="landing-title"
			>
				<h1 id="landing-title" className="text-4xl leading-tight font-bold">
					Start a room, gather players, and start playing.
				</h1>
				<div className="flex flex-wrap justify-center gap-3">
					<Link className="btn btn-primary" href="/lobby">
						Start playing
					</Link>
				</div>
				<TriviaCardExample />
			</section>
		</main>
	);
}
