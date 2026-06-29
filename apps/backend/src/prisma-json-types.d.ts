export {};

declare global {
	namespace PrismaJson {
		type TriviaEntry = {
			text: string;
			answer: string | string[] | boolean | number;
		};

		type TriviaCardData = {
			prompt: string;
			uiHint?: "country";
			entries: TriviaEntry[];
			choices?: string[];
		};

		type LocalizedString = Record<string, string>;
	}
}
