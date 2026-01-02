import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEV_KEY = process.env.DEV_TEST_KEY || "";

type Body = {
  key?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const key = String(body.key ?? "").trim();

    if (!DEV_KEY) {
      return NextResponse.json(
        { error: "DEV_TEST_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    if (!key) {
      return NextResponse.json(
        { error: "Missing dev key." },
        { status: 400 },
      );
    }

    if (key !== DEV_KEY) {
      return NextResponse.json(
        { error: "Invalid dev key." },
        { status: 401 },
      );
    }

    // ✅ Dev key is valid → set an HttpOnly cookie so SSR/middleware can trust this session
    const res = NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    );

    res.cookies.set("devpass", "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res;
  } catch (e: any) {
    console.error("[developer:session:start] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to start dev session." },
      { status: 500 },
    );
  }
}