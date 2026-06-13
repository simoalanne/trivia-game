import { defineService } from "../../initServer.ts";
import prismaClient from "../../prisma.ts";

export default defineService("countries", {
	async list() {
		const countries = await prismaClient.country.findMany({
			select: {
				country_code: true,
			},
		});
		return countries.map((c) => c.country_code);
	},
});
