import {
	type CallSettings,
	type InferUITools,
	isStepCount,
	streamText,
	type UIDataTypes,
	type UIMessage,
} from "ai";
import type { QuestionCardsRepo } from "../questionCards/questionCards.repo.ts";
import { buildSystemPrompt } from "./cardAgent.prompt.ts";
import { type CardAgentTools, createTools } from "./cardAgent.tools.ts";
import {
	type AgentConfig,
	createAgentModel,
	loadAgentConfig,
} from "./config.ts";

export type CardAgentUIMessage = UIMessage<
	never,
	UIDataTypes,
	InferUITools<CardAgentTools>
>;

export type RunCardAgentOptions = {
	instruction: string;
	autoApply: boolean;
	reasoning?: CallSettings["reasoning"];
	config?: AgentConfig;
	repo?: QuestionCardsRepo;
	signal?: AbortSignal;
};

/**
 * Runs one stateless agent action: a single instruction, the tool loop, and a
 * short final reply. Has no transport dependency, so the RPC router and the
 * tests share it.
 */
export const runCardAgent = ({
	instruction,
	autoApply,
	reasoning,
	config = loadAgentConfig(),
	repo,
	signal,
}: RunCardAgentOptions) => {
	const tools = createTools({ autoApply, repo });

	const result = streamText({
		model: createAgentModel(config),
		instructions: buildSystemPrompt({ autoApply }),
		prompt: instruction,
		tools,
		stopWhen: isStepCount(config.maxSteps),
		temperature: config.temperature,
		reasoning: reasoning ?? config.reasoningDefault,
		timeout: config.timeoutMs,
		abortSignal: signal,
	});

	return { result, tools };
};
