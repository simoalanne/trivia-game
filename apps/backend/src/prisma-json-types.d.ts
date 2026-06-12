export {};

declare global {
  namespace PrismaJson {
    type TriviaEntry = {
      text: string;
      answer: string | string[] | boolean | number;
      explanation?: string; 
    };

    type TriviaCardData = {
      prompt: string;
      entries: TriviaEntry[];
      choices?: string[];
    };
  }
}
