import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { router } from "@rest-rpc/core";
import gameplay, { gameplayContract } from "./gameplay.ts";
import { questionsCrudContract } from "./questionsCrud.ts";

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
	MAX_QUESTION_IMAGE_BYTES,
	MAX_TAGS_PER_CARD,
	MIN_ENTRIES_PER_CARD,
	questionCardAnswerModeSchema,
	questionCardInputSchema,
	questionCardSchema,
	questionImageContentTypes,
	questionImageSchema,
	questionsCrudContract,
	triviaCardDifficultySchema,
	triviaCardIdSchema,
} from "./questionsCrud.ts";

export const contracts = router(gameplay, {
	pathPrefix: "/api",
});

export const orpcContract = oc.meta(openapi({ prefix: "/api" })).router({
	gameplay: gameplayContract,
	questionsCrud: questionsCrudContract,
});
