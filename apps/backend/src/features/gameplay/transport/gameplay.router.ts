import { implement } from "@orpc/server";
import { orpcContract } from "@packages/contracts";
import { createGame, joinGame, leaveGame, verifyGame } from "../matchmaking.ts";

const os = implement(orpcContract.gameplay);

const gameplayRouter = os.router({
	create: os.create.handler(async ({ input }) => ({
		status: 201,
		body: createGame(input.body),
	})),

	join: os.join.handler(async ({ input }) => ({
		status: 201,
		body: joinGame(input.body),
	})),

	leave: os.leave.handler(async ({ input }) => {
		await leaveGame(input.body);
		return { status: 200, body: { ok: true } };
	}),

	verifyGame: os.verifyGame.handler(async ({ input }) => ({
		status: 200,
		body: verifyGame(input.query),
	})),
});

export default gameplayRouter;
