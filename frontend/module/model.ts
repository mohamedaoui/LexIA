import {
  GoogleGenAI,
  type ContentListUnion,
  type Content,
} from "@google/genai";
import { Chat, Sender } from "@/app/generated/prisma";
import type { QueryResult } from "./types";

export class Gemini {
  private ai: GoogleGenAI;

  constructor() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      process.exit(1);
    }
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  public async embedContent(contents: string[]): Promise<number[][]> {
    const response = await this.ai.models.embedContent({
      model: "models/text-embedding-004", // gemini-embedding-exp-03-07
      contents,
      config: {
        taskType: "RETRIEVAL_QUERY",
        //   outputDimensionality: 1536, // 768
      },
    });

    if (!response.embeddings) {
      throw new Error("No embeddings found in response");
    }
    return response.embeddings.map((embedding) => {
      if (!embedding.values) {
        throw new Error("No values found in embedding");
      }
      return embedding.values;
    });
  }

  public async *prompt(contents: ContentListUnion): AsyncGenerator<string> {
    const response = await this.ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents,
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  public chatsToContents(chats: Chat[]): Content[] {
    return chats.map((chat) => this.chatToContent(chat));
  }

  public async promptPromise(TittlePromptInput: Content[]): Promise<string> {
    let fullText = "";

    for await (const chunk of this.prompt(TittlePromptInput)) {
      fullText += chunk;
    }

    return fullText;
  }

  public messagesToContentsUser(msgs: string[]): Content[] {
    return msgs.map((msg) => ({
      role: "user",
      parts: [{ text: msg }],
    }));
  }

  private chatToContent(chat: Chat): Content {
    return {
      role: chat.sender,
      parts: [{ text: chat.message }],
    };
  }
}
