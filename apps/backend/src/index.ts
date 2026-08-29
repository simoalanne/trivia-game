import "dotenv/config";
import { createServer } from "node:http";
import { contracts } from "@packages/contracts";
import { createOpenApiDocument } from "@rest-rpc/core";
import { registerRoutes } from "@rest-rpc/express";
import { apiReference } from "@scalar/express-api-reference";
import express from "express";
import { WebSocketServer } from "ws";
import z from "zod";
import gameplayService from "./features/gameplay/gameplay.service.ts";
import questionsCrudService from "./features/questionsCrud/questionsCrud.service.ts";
import { NotFoundError } from "./utils/NotFoundError.ts";

const app = express();
const server = createServer(app);
const webSocketServer = new WebSocketServer({ noServer: true });
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(express.raw({ type: ["image/jpeg", "image/png"], limit: "5mb" }));

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

app.get("/openapi.json", (_req, res) => {
	res.json(openApiDocument);
});

app.use("/api-docs", apiReference({ url: "/openapi.json" }));

const routes = {
	gameplay: gameplayService,
	questionsCrud: questionsCrudService,
};

const loggingMiddleware = (
	_req: express.Request,
	_res: express.Response,
	next: express.NextFunction,
	route: { method: string; path: string },
) => {
	console.log(`Incoming ${route.method} request to ${route.path}`);
	next();
};

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept",
	);
	if (req.method === "OPTIONS") {
		return res.sendStatus(200);
	}
	next();
});

registerRoutes(app, routes, {
	middleware: [loggingMiddleware],
	webSocket: {
		server,
		webSocketServer,
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

server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
