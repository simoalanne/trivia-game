import "dotenv/config";
import { COMMON_ERROR_STATUS_MAP, OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { ORPCError, onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { contracts, orpcContract } from "@packages/contracts";
import { createOpenApiDocument } from "@rest-rpc/core";
import { registerRoutes } from "@rest-rpc/hono";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import z from "zod";
import gameplayService from "./features/gameplay/gameplay.service.ts";
import gameplayRouter from "./features/gameplay/transport/gameplay.router.ts";
import questionsCrudService from "./features/questionsCrud/questionsCrud.service.ts";
import { NotFoundError } from "./utils/NotFoundError.ts";

const app = new Hono();
const port = Number(process.env.PORT ?? 3000);

const restRpcOpenApiDocument = createOpenApiDocument(contracts, {
	info: {
		title: "Trivia Game API",
		version: "1.0.0",
	},
	schemaConverter: (schema) => {
		try {
			return z.toJSONSchema(schema as z.ZodType);
		} catch {
			return {};
		}
	},
});

const orpcOpenApiDocument = await new OpenAPIGenerator({
	converters: [new ZodToJsonSchemaConverter()],
}).generate(orpcContract, {
	version: "3.1.0",
});

const openApiDocument = {
	...restRpcOpenApiDocument,
	paths: {
		...restRpcOpenApiDocument.paths,
		...orpcOpenApiDocument.paths,
	},
	components: {
		...restRpcOpenApiDocument.components,
		...orpcOpenApiDocument.components,
	},
};

const apiHandler = new OpenAPIHandler(
	{ gameplay: gameplayRouter, questionsCrud: questionsCrudService },
	{
		interceptors: [
			onError((error) => {
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
			}),
		],
	},
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

const routes = {
	gameplay: gameplayService,
};

registerRoutes(app, routes, {
	webSocket: {
		upgradeWebSocket,
	},
	errorHandlers: {
		onUnhandledError: ({ error }) => {
			if (error instanceof NotFoundError) {
				return {
					status: 404,
					body: { message: error.message },
				};
			}
		},
	},
});

export default {
	port,
	fetch: app.fetch,
	websocket,
};
