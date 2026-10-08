import type {
	GameplayState,
	PlayersUpdateMessage,
	TurnResolvedMessage,
} from "@packages/contracts";

export type GameState = GameplayState["gameState"];

export type GamePlayer = {
	id: string;
	name: string;
	isHost: boolean;
	isReady: boolean;
	isPlayerTurn: boolean;
	isParticipatingInCurrentRound: boolean;
	waitingForNextRoundReason: "JOINED_MID_ROUND" | "DONE_ANSWERING" | null;
	totalPoints: number;
	roundPoints: number;
};

type TriviaSourceCardEntry = {
	id: string;
	text: string;
	answer: PrismaJson.TriviaEntry["answer"];
};

type BaseActiveRound = {
	id: number;
	prompt: string;
	entries: TriviaSourceCardEntry[];
	answeredEntryIds: Set<string>;
};

export type ActiveRound =
	| (BaseActiveRound & {
			answerMode: "TEXT";
	  })
	| (BaseActiveRound & {
			answerMode: "COUNTRY";
	  })
	| (BaseActiveRound & {
			answerMode: "CHOICES";
			choices: string[];
			choicesAreUnique: boolean;
	  });

export type GameSession = {
	gameCode: string;
	players: GamePlayer[];
	currentRound: ActiveRound | null;
	gameState: GameState;
	round: number;
	playedThroughCardIds: number[];
	openedEntryIndex: number | null;
	turnDurationSeconds: number;
	turnRemainingMs: number | null;
	turnExpiresAt: string | null;
	isTurnPaused: boolean;
};

/** Draws a random card that is not in `excludedIds`, or null when none are left. */
export type DrawCard = (excludedIds: number[]) => Promise<ActiveRound | null>;

/** Dependencies the game rules need from the outside world. */
export type GameRuleContext = {
	drawCard: DrawCard;
	now: () => number;
};

/** Something that happened while applying a rule, announced to every player. */
export type GameEvent = TurnResolvedMessage | PlayersUpdateMessage;
