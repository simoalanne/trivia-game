export {};

declare global {
	namespace PrismaJson {
		type TriviaEntry = {
			text: string;
			answer: string;
		};

		type TextTriviaCardData = {
			prompt: string;
			answerMode: "TEXT";
			entries: TriviaEntry[];
		};

		type CountryTriviaCardData = {
			prompt: string;
			answerMode: "COUNTRY";
			entries: TriviaEntry[];
		};

		type ChoicesTriviaCardData = {
			prompt: string;
			answerMode: "CHOICES";
			entries: TriviaEntry[];
			choices: string[];
			choicesAreUnique: boolean;
		};

		type TriviaCardData =
			| TextTriviaCardData
			| CountryTriviaCardData
			| ChoicesTriviaCardData;

		type LocalizedString = Record<string, string>;
	}
}
