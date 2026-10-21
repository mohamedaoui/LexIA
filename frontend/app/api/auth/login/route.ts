// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/app/services/userService";
import argon2 from "argon2";
import { SignJWT } from "jose";
import { z } from "zod";

const encoder = new TextEncoder();
const JWT_SECRET = encoder.encode(process.env.JWT_SECRET!);

// Zod schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await req.json());

    const user = await userService.findByEmail(email);
    if (!user || !(await argon2.verify(user.password, password))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await new SignJWT({ userId: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("2h")
      .sign(JWT_SECRET);

    return NextResponse.json({ token }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
