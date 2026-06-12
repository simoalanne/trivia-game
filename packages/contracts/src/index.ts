import type {
	ContractApiRequest,
	ContractApiResponse,
	DotPaths,
} from "@contract-first-api/core";
import gameplay from "./gameplay.ts";

export type {
	GameplayClientMessage,
	GameplayCurrentCard,
	GameplayPlayer,
	GameplayServerMessage,
	GameplaySession,
} from "./gameplay.ts";

export const contracts = {
	...gameplay,
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
