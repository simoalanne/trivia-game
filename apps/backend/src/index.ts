import "dotenv/config";
import { Buffer } from "node:buffer";
import { contracts } from "@packages/contracts";
import { createOpenApiDocument } from "@rest-rpc/core";
import type { HonoParseBody } from "@rest-rpc/hono";
import { registerRoutes } from "@rest-rpc/hono";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import z from "zod";
import gameplayService from "./features/gameplay/gameplay.service.ts";
import questionsCrudService from "./features/questionsCrud/questionsCrud.service.ts";
import { NotFoundError } from "./utils/NotFoundError.ts";

const app = new Hono();
const port = Number(process.env.PORT ?? 3000);

const openApiDocument = createOpenApiDocument(contracts, {
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

app.use(cors());

app.get("/openapi.json", (c) => {
	return c.json(openApiDocument);
});

app.use("/api-docs", apiReference({ url: "/openapi.json" }));

app.use("*", async (c, next) => {
	console.log(`Incoming request: ${c.req.method} ${c.req.url}`);
	await next();
});

const routes = {
	gameplay: gameplayService,
	questionsCrud: questionsCrudService,
};

const imageContentTypes = new Set(["image/jpeg", "image/png"]);

const parseBody: HonoParseBody = async ({ c }) => {
	const contentType = c.req.header("content-type")?.split(";")[0]?.trim();

	if (contentType && imageContentTypes.has(contentType.toLowerCase())) {
		return Buffer.from(await c.req.raw.arrayBuffer());
	}

	return c.req.json();
};

registerRoutes(app, routes, {
	parseBody,
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
