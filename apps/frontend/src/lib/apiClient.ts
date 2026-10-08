import { createORPCClient } from "@orpc/client";
import type { RouterContractClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { orpcContract } from "@packages/contracts";
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

	return {
		orpcClient,
		orpc,
		openGameplaySocket: (query: GameplaySocketQuery) =>
			openGameplaySocket(baseUrl, query),
	};
};
