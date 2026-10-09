import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		setupFiles: ["dotenv/config"],
		// Agent tests call a real model, one at a time.
		testTimeout: 180_000,
		fileParallelism: false,
	},
});
