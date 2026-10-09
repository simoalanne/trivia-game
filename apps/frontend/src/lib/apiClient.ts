import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterContractClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";
import { OpenAPILink } from "@orpc/openapi/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { orpcContract } from "@packages/contracts";
import type { CardAgentRouter } from "backend/types";
import { type GameplaySocketQuery, openGameplaySocket } from "./gameplaySocket";

const getBaseUrl = () => {
	const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!baseUrl) {
		throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable is not set");
	}

	return baseUrl;
};

export const createApiClients = () => {
	const baseUrl = getBaseUrl();
	const orpcLink = new OpenAPILink(orpcContract, {
		origin: baseUrl,
		fetch: (url, init) => {
			const timeoutSignal = AbortSignal.timeout(120000);
			return globalThis.fetch(url, {
				...init,
				signal: init.signal
					? AbortSignal.any([init.signal, timeoutSignal])
					: timeoutSignal,
			});
		},
	});
	const orpcClient: JsonifiedClient<RouterContractClient<typeof orpcContract>> =
		createORPCClient(orpcLink);
	const orpc = createTanstackQueryUtils(orpcClient);
	// The card agent is RPC only, typed from the backend router. It streams for
	// as long as the model works, so it has no timeout.
	const cardAgentClient: RouterClient<CardAgentRouter> = createORPCClient(
		new RPCLink({ origin: baseUrl, url: "/rpc/cardAgent" }),
	);

	return {
		orpcClient,
		orpc,
		cardAgentClient,
		openGameplaySocket: (query: GameplaySocketQuery) =>
			openGameplaySocket(baseUrl, query),
	};
};
