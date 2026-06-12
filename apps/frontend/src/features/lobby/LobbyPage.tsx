import LobbyClient from "./LobbyClient";

type LobbyPageProps = {
	params: Promise<{
		gameCode: string;
	}>;
};

export default async function LobbyPage({ params }: LobbyPageProps) {
	const { gameCode } = await params;

	return <LobbyClient gameCode={gameCode} />;
}
