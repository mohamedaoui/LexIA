// webapp/app/api/chatbot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Gemini } from "@/module/model";
import { PineconeDatabase } from "@/module/database";
import { buildDocsPrompt, SystemPrompt } from "@/extension/promptBuilder";

import { chatService } from "@/app/services/chatService";
import { Sender } from "@/app/generated/prisma";

import { GetFullInfoLang, TranslateText } from "@/extension/translationManager";

const gemini = new Gemini();
const database = new PineconeDatabase("moroccan-law-db");

const DOC_COUNT = 10;

const PAGE_SIZE = 20;

const getHistoryQuerySchema = z.object({
  sessionId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : PAGE_SIZE))
    .pipe(z.number().int().positive()),
});

const postBodySchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  prompt: z.string().min(1),
});

// get to get history

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const result = getHistoryQuerySchema.safeParse({
    sessionId: url.searchParams.get("sessionId"),
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid query params", issues: result.error.errors },
      { status: 400 }
    );
  }

  const { sessionId, cursor, limit } = result.data;

  const { chats, nextCursor } = await chatService.findBySession(
    sessionId,
    cursor,
    limit
  );

  return NextResponse.json({ chats: chats, nextCursor });
}

// post to get answer

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parseResult = postBodySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error }, { status: 400 });
  }

  const { userId, sessionId, prompt } = parseResult.data;

  await chatService.create({
    userId,
    sessionId: sessionId,
    sender: Sender.user,
    message: prompt,
  });

  let promptEng: string;
  let lang: string;
  try {
    const {
      translatedText,
      detectedLanguage: { language },
    } = await TranslateText(prompt);
    promptEng = translatedText;

    const { name } = await GetFullInfoLang(language);

    lang = name;
  } catch (error) {
    console.error("Translation failed, using original prompt:", error);
    promptEng = prompt;
    lang =
      "use user latest message language and tell him there was a problem with detecting your language use another language ";
  }
  console.log(lang);
  const emb = await gemini.embedContent([promptEng]);

  const top = await database.query(emb[0]!, DOC_COUNT);

  const docsPrompt = buildDocsPrompt(top);

  if (docsPrompt) {
    chatService.create({
      userId,
      sessionId: sessionId,
      sender: Sender.user,
      message: docsPrompt,
      type: "docs",
    });
  }
  const stream = new ReadableStream({
    async start(ctrl) {
      const enc = new TextEncoder();
      let fullReply = "";

      const { chats: recentChats } = await chatService.findBySession(
        sessionId,
        undefined,
        10
      );

      const sysPrompt = gemini.messagesToContentsUser([SystemPrompt(lang)]);

      const history = gemini.chatsToContents(recentChats);

      const inputModel = sysPrompt.concat(history);

      for await (const chunk of gemini.prompt(inputModel)) {
        fullReply += chunk;
        ctrl.enqueue(enc.encode(chunk));
      }
      ctrl.close();

      await chatService.create({
        userId,
        sessionId: sessionId,
        sender: Sender.model,
        message: fullReply,
      });
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
}
