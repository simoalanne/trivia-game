import { implement } from "@orpc/server";
import { orpcContract } from "@packages/contracts";
import { NotFoundError } from "../../../utils/NotFoundError.ts";
import { JoinRejectedError } from "../gameplay.types.ts";
import { createGame, joinGame, leaveGame, verifyGame } from "../matchmaking.ts";

/** Maps matchmaking errors to the errors declared in the contract. */
const os = implement(orpcContract.gameplay).use(async ({ next, errors }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof NotFoundError && "NOT_FOUND" in errors) {
			throw errors.NOT_FOUND({ message: error.message });
		}
		if (error instanceof JoinRejectedError && "CONFLICT" in errors) {
			throw errors.CONFLICT({ data: { reason: error.code } });
		}
		throw error;
	}
});

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
