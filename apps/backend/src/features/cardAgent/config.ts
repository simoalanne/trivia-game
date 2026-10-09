import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { CallSettings } from "ai";
import z from "zod";

/** The AI SDK's reasoning levels. The provider maps them to its request. */
export const reasoningSchema = z.enum([
	"provider-default",
	"none",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
]) satisfies z.ZodType<CallSettings["reasoning"]>;

const agentConfigSchema = z.object({
	baseUrl: z.string().url().default("http://localhost:11434/v1"),
	model: z.string().min(1),
	apiKey: z.string().optional(),
	maxSteps: z.coerce.number().int().positive().default(8),
	temperature: z.coerce.number().min(0).max(2).default(0.2),
	reasoningDefault: reasoningSchema.default("none"),
	timeoutMs: z.coerce.number().int().positive().default(180_000),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

const env = (name: string) => process.env[name]?.trim() || undefined;

export const loadAgentConfig = (): AgentConfig => {
	const result = agentConfigSchema.safeParse({
		baseUrl: env("AGENT_BASE_URL"),
		model: env("AGENT_MODEL"),
		apiKey: env("AGENT_API_KEY"),
		maxSteps: env("AGENT_MAX_STEPS"),
		temperature: env("AGENT_TEMPERATURE"),
		reasoningDefault: env("AGENT_REASONING_DEFAULT"),
		timeoutMs: env("AGENT_TIMEOUT_MS"),
	});

	if (!result.success) {
		throw new Error(
			`Invalid card agent config (AGENT_* env vars): ${z.prettifyError(result.error)}`,
		);
	}

	return result.data;
};

export const createAgentModel = (config: AgentConfig) =>
	createOpenAICompatible({
		name: "agent",
		baseURL: config.baseUrl,
		apiKey: config.apiKey,
		includeUsage: true,
	}).chatModel(config.model);
