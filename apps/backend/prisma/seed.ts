import { countries } from "countries-list";
import type { Prisma } from "../generated/prisma/client.ts";
import prisma from "../src/prisma.ts";
import data from "./seedData.json" with { type: "json" };

await prisma.$transaction([
	prisma.triviaCard.deleteMany(),
	prisma.triviaCard.createMany({
		data: data as Prisma.TriviaCardCreateManyInput[],
	}),
	prisma.country.deleteMany(),
	prisma.country.createMany({
		data: Object.entries(countries).map(([code]) => ({
			country_code: code,
		})),
	}),
]);

console.info(
	`Seeded ${data.length} trivia cards and ${Object.keys(countries).length} countries.`,
);

await prisma.$disconnect();
