// app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sessionService } from "@/app/services/sessionService";
import { z } from "zod";
import { TitlePrompt } from "@/extension/promptBuilder";
import { Gemini } from "@/module/model";

const gemini = new Gemini();

const PAGE_SIZE = 50;

const getSessionsQuerySchema = z.object({
  userId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGE_SIZE))
    .pipe(z.number().int().positive()),
});

const createSessionSchema = z.object({
  userId: z.string().uuid(),
  prompt: z.string().min(1, "Prompt is required"),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const parsed = getSessionsQuerySchema.parse({
      userId: url.searchParams.get("userId"),
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const all = await sessionService.findAllByUser(parsed.userId);
    let start = 0;
    if (parsed.cursor) {
      start = all.findIndex((s) => s.id === parsed.cursor) + 1;
    }
    const page = all.slice(start, start + parsed.limit);
    const nextCursor =
      page.length === parsed.limit ? page[page.length - 1].id : null;

    return NextResponse.json({ sessions: page, nextCursor });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, prompt } = createSessionSchema.parse(body);

    const TitlePromptInput = gemini.messagesToContentsUser([
      TitlePrompt,
      prompt,
    ]);

    const title = await gemini.promptPromise(TitlePromptInput);

    const session = await sessionService.create({ userId, title });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log(e.errors);
      return NextResponse.json(
        { error: "Invalid input", issues: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
