import z from "zod";
import { defineContractTree } from "./initContracts.ts";

export default defineContractTree({
	countries: {
		list: {
			path: "/countries/list",
			method: "GET",
			response: z.array(z.string()),
		},
	},
});
