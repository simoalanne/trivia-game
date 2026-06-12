import ActiveGameClient from "./ActiveGameClient";

type ActiveGamePageProps = {
	params: Promise<{
		gameCode: string;
	}>;
};

export default async function ActiveGamePage({ params }: ActiveGamePageProps) {
	const { gameCode } = await params;

	return <ActiveGameClient gameCode={gameCode} />;
}
