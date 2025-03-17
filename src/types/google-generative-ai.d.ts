declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    
    getGenerativeModel(options: { model: string }): GenerativeModel;
  }
  
  export class GenerativeModel {
    generateContent(prompt: string | Array<string | Part>): Promise<GenerateContentResponse>;
  }
  
  export interface Part {
    text?: string;
    inlineData?: {
      data: string;
      mimeType: string;
    };
  }
  
  export interface GenerateContentResponse {
    response: {
      text(): string;
    };
  }
} 