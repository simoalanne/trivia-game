import "dotenv/config";
import { createServer } from "node:http";
import { initServer } from "@contract-first-api/express";
import { createOpenApiDocument } from "@contract-first-api/openapi";
import { contracts } from "@packages/contracts";
import { apiReference } from "@scalar/express-api-reference";
import type { ErrorRequestHandler } from "express";
import express from "express";
import countriesService from "./features/countries/countries.service.ts";
import gameplayService from "./features/gameplay/gameplay.service.ts";
import questionsCrudService from "./features/questionsCrud/questionsCrud.service.ts";
import { NotFoundError } from "./utils/NotFoundError.ts";

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT ?? 3000);

type RequestContext = Record<string, unknown>;

export const {
	defineService,
	defineMiddleware,
	createRouter,
	createContractModeMiddleware,
} = initServer<typeof contracts, RequestContext>();

app.use(
	createContractModeMiddleware({
		contracts,
		nonRaw: express.json(),
		raw: express.raw({ type: ["image/jpeg", "image/png"], limit: "5mb" }),
		routePrefix: "/api",
	}),
);

const openApiDocument = createOpenApiDocument(contracts, {
	info: {
		title: "Contract First API Project",
		version: "1.0.0",
	},
});

app.get("/openapi.json", (_req, res) => {
	res.json(openApiDocument);
});

app.use("/api-docs", apiReference({ url: "/openapi.json" }));

const loggingMiddleware = defineMiddleware(async (req, _, next) => {
	console.log(
		`Incoming ${req.contract.method}  request to ${req.contract.path}`,
	);
	next();
});

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

createRouter({
	app,
	server,
	contracts,
	services: {
		gameplay: gameplayService,
		questionsCrud: questionsCrudService,
		countries: countriesService,
	},
	middlewares: [loggingMiddleware],
	routePrefix: "/api",
	createContext: async (_req) => {
		return {};
	},
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	if (error instanceof NotFoundError) {
		res.status(404).json({ message: error.message });
		return;
	}

	console.error(error);
	res.status(500).json({ message: "Internal server error" });
};

app.use(errorHandler);

server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
