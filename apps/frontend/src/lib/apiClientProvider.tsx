"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { createApiClients } from "./apiClient";

const api = createApiClients();
export const queryClient = new QueryClient();

type ApiClientProviderProps = {
	children: React.ReactNode;
};

type ApiClientContextValue = typeof api;

const ApiClientContext = createContext<ApiClientContextValue | null>(null);

export const ApiClientProvider = ({ children }: ApiClientProviderProps) => {
	return (
		<QueryClientProvider client={queryClient}>
			<ApiClientContext.Provider value={api}>
				{children}
			</ApiClientContext.Provider>
		</QueryClientProvider>
	);
};

export const useApiClient = () => {
	const context = useContext(ApiClientContext);
	if (!context) {
		throw new Error("useApiClient must be used within an ApiClientProvider");
	}
	return context;
};
