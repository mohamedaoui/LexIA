import { sessionService } from "@/app/services/sessionService";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const sessionIdSchema = z.string().uuid();
  
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idValidation = sessionIdSchema.safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

  try {
    const session = await sessionService.findById(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}