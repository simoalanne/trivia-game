import type {
	ContractApiRequest,
	ContractApiResponse,
	DotPaths,
} from "@contract-first-api/core";
import gameplay from "./gameplay.ts";
import questionsCrud from "./questionsCrud.ts";

export type {
	GameplayClientMessage,
	GameplayServerMessage,
	GameplayState,
	GamestateMessage,
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

export const contracts = {
	...gameplay,
	...questionsCrud,
};

type AppContracts = typeof contracts;
type ApiPath = DotPaths<AppContracts>;

export type ApiRequest<Path extends ApiPath> = ContractApiRequest<
	AppContracts,
	Path
>;

export type ApiResponse<Path extends ApiPath> = ContractApiResponse<
	AppContracts,
	Path
>;
