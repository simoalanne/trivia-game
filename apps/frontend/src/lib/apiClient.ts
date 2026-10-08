import { createORPCClient } from "@orpc/client";
import type { RouterContractClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { contracts, orpcContract } from "@packages/contracts";
import { initClient } from "@rest-rpc/core";
import { createTanstackQueryHelpers } from "@rest-rpc/tanstack-query";

const getBaseUrl = () => {
	const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!baseUrl) {
		throw new Error("NEXT_PUBLIC_API_BASE_URL environment variable is not set");
	}

	return baseUrl;
};

export const createApiClients = () => {
	const baseUrl = getBaseUrl();
	const client = initClient(contracts, {
		baseUrl,
		fetchOptions: {
			next: { revalidate: 10 },
		},
		timeoutMs: 120000,
		strictStatusCodes: true,
	});

	const tq = createTanstackQueryHelpers(contracts, {
		baseUrl,
		timeoutMs: 120000,
		strictStatusCodes: true,
	});

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

	return { client, tq, orpcClient, orpc };
};
