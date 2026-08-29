import { contracts } from "@packages/contracts";
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

	return { client, tq };
};
