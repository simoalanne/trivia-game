import type {
	ContractApiRequest,
	ContractApiResponse,
	DotPaths,
} from "@contract-first-api/core";
import gameplay from "./gameplay.ts";
import questionsCrud from "./questionsCrud.ts";

export type {
	GameplayClientMessage,
	GameplayCurrentCard,
	GameplayPlayer,
	GameplayServerMessage,
	GameplaySession,
} from "./gameplay.ts";
export type {
	QuestionCard,
	QuestionCardInput,
	TriviaCardDifficulty,
	TriviaCardFormat,
} from "./questionsCrud.ts";
export {
	questionCardInputSchema,
	questionCardSchema,
	triviaCardDifficultySchema,
	triviaCardFormatSchema,
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
