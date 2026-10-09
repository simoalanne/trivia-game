import "dotenv/config";
import { COMMON_ERROR_STATUS_MAP, OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { orpcContract } from "@packages/contracts";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { websocket } from "hono/bun";
import { cors } from "hono/cors";
import cardAgentRouter from "./features/cardAgent/cardAgent.router.ts";
import gameplayRouter from "./features/gameplay/transport/gameplay.router.ts";
import { registerGameplaySocket } from "./features/gameplay/transport/gameplay.socket.ts";
import questionsCrudService from "./features/questionsCrud/questionsCrud.service.ts";

const app = new Hono();
const port = Number(process.env.PORT ?? 3000);

const openApiDocument = await new OpenAPIGenerator({
	converters: [new ZodToJsonSchemaConverter()],
}).generate(orpcContract, {
	version: "3.1.0",
	base: {
		info: {
			title: "Trivia Game API",
			version: "1.0.0",
		},
	},
});

const logServerError = (error: unknown) => {
	if (
		error instanceof ORPCError &&
		error.code in COMMON_ERROR_STATUS_MAP &&
		COMMON_ERROR_STATUS_MAP[
			error.code as keyof typeof COMMON_ERROR_STATUS_MAP
		] < 500
	) {
		return;
	}

	console.error(error);
};

const apiHandler = new OpenAPIHandler(
	{ gameplay: gameplayRouter, questionsCrud: questionsCrudService },
	{ interceptors: [onError(logServerError)] },
);

const rpcHandler = new RPCHandler(
	{ cardAgent: cardAgentRouter },
	{ interceptors: [onError(logServerError)] },
);

app.use(cors());

app.get("/openapi.json", (c) => {
	return c.json(openApiDocument);
});

app.use("/api-docs", apiReference({ url: "/openapi.json" }));

app.use("*", async (c, next) => {
	console.log(`Incoming request: ${c.req.method} ${c.req.url}`);
	await next();
});

app.use("/api/*", async (c, next) => {
	const { matched, response } = await apiHandler.handle(c.req.raw, {
		context: {},
	});

	if (matched) {
		return c.newResponse(response.body, response);
	}

	await next();
});

app.use("/rpc/*", async (c, next) => {
	const { matched, response } = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: {},
	});

	if (matched) {
		return c.newResponse(response.body, response);
	}

	await next();
});

registerGameplaySocket(app);

export default {
	port,
	fetch: app.fetch,
	websocket,
};
