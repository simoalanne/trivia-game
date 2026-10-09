import { implement, ORPCError } from "@orpc/server";
import { orpcContract } from "@packages/contracts";
import questionCardsRepo, {
	type WriteResult,
} from "../questionCards/questionCards.repo.ts";

const notFound = () =>
	new ORPCError("NOT_FOUND", { message: "Question not found" });

const unwrapWriteResult = (result: WriteResult) => {
	if (!result.ok) {
		throw notFound();
	}

	return result.card;
};

const os = implement(orpcContract.questionsCrud);

const questionsCrudService = os.router({
	list: os.list.handler(async () => {
		return { status: 200, body: await questionCardsRepo.listCards() };
	}),

	getById: os.getById.handler(async ({ input }) => {
		const card = await questionCardsRepo.findCard(input.params.id);
		if (!card) {
			throw notFound();
		}

		return { status: 200, body: card };
	}),

	create: os.create.handler(async ({ input: { body: card } }) => {
		return { status: 201, body: await questionCardsRepo.createCard(card) };
	}),

	update: os.update.handler(async ({ input: { params, body: card } }) => {
		const result = await questionCardsRepo.updateCard(params.id, card);
		return { status: 200, body: unwrapWriteResult(result) };
	}),

	delete: os.delete.handler(async ({ input }) => {
		const result = await questionCardsRepo.deleteCard(input.params.id);
		return { status: 200, body: unwrapWriteResult(result) };
	}),
});

export default questionsCrudService;
