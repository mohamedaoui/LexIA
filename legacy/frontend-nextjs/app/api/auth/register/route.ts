// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/app/services/userService";
import argon2 from "argon2";

import { z } from "zod";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "lawyer", "judge"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, role } =
      registerSchema.parse(body);

    const hashed = await argon2.hash(password);

    const user = await userService.create({
      firstName,
      lastName,
      email,
      password: hashed,
      role,
    });

    return NextResponse.json(
      {
        id: user.id,
        firstName: firstName,
        lastName: lastName,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", issues: e.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
