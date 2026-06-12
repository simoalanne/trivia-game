import type { Prisma } from "../generated/prisma/client.ts";
import prisma from "../src/prisma.ts";
import data from "./seedData.json" with { type: "json" };

await prisma.$transaction([
	prisma.triviaCard.deleteMany(),
	prisma.triviaCard.createMany({
		data: data as Prisma.TriviaCardCreateManyInput[],
	}),
]);

console.info(`Seeded ${data.length} trivia cards.`);

await prisma.$disconnect();
