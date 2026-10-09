import { os, streamToAsyncIteratorObject } from "@orpc/server";
import { toUIMessageStream } from "ai";
import z from "zod";
import { type CardAgentUIMessage, runCardAgent } from "./cardAgent.agent.ts";
import { loadAgentConfig, reasoningSchema } from "./config.ts";

const cardAgentRouter = {
	run: os
		.input(
			z.object({
				instruction: z.string().trim().min(1).max(2000),
				autoApply: z.boolean(),
				reasoning: reasoningSchema.optional(),
			}),
		)
		.handler(({ input, signal }) => {
			const { result, tools } = runCardAgent({ ...input, signal });

			return streamToAsyncIteratorObject(
				toUIMessageStream<typeof tools, CardAgentUIMessage>({
					stream: result.stream,
					tools,
				}),
			);
		}),

	settings: os.handler(() => {
		const config = loadAgentConfig();
		return {
			model: config.model,
			reasoningDefault: config.reasoningDefault,
		};
	}),
};

export type CardAgentRouter = typeof cardAgentRouter;

export default cardAgentRouter;
