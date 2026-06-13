import type {
	ContractApiRequest,
	ContractApiResponse,
	DotPaths,
} from "@contract-first-api/core";
import countries from "./countries.ts";
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
	triviaCardUiHintSchema,
} from "./questionsCrud.ts";

export const contracts = {
	...gameplay,
	...questionsCrud,
	...countries,
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
