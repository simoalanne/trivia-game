import { initServer } from "@contract-first-api/express";
import type { contracts } from "@packages/contracts";
type RequestContext = Record<string, unknown>;

export const { defineService, defineMiddleware, createRouter } = initServer<
  typeof contracts,
  RequestContext
>();
