import { initContracts } from "@contract-first-api/core";

type ContractMeta = Record<string, unknown>;

export const { defineContractTree } = initContracts<ContractMeta>();