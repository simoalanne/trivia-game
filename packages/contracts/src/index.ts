import { router } from "@rest-rpc/core";
import gameplay from "./gameplay.ts";
import questionsCrud from "./questionsCrud.ts";

export type {
	GameplayClientMessage,
	GameplayServerMessage,
	GameplayState,
	GamestateMessage,
	PlayersUpdateMessage,
	TurnResolvedMessage,
} from "./gameplay.ts";
export {
	gameplayTurnTimeoutSecondsDefault,
	gameplayTurnTimeoutSecondsMax,
	gameplayTurnTimeoutSecondsMin,
} from "./gameplay.ts";
export type {
	QuestionCard,
	QuestionCardAnswerMode,
	QuestionCardInput,
	TriviaCardDifficulty,
} from "./questionsCrud.ts";
export {
	MAX_ENTRIES_PER_CARD,
	MAX_TAGS_PER_CARD,
	MIN_ENTRIES_PER_CARD,
	questionCardAnswerModeSchema,
	questionCardInputSchema,
	questionCardSchema,
	triviaCardDifficultySchema,
	triviaCardIdSchema,
} from "./questionsCrud.ts";

export const contracts = router(
	{
		...gameplay,
		...questionsCrud,
	},
	{
		pathPrefix: "/api",
	},
);
