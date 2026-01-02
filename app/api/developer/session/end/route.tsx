import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_req: NextRequest) {
  try {
    const res = NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
        },
      },
    );

    // Clear the HttpOnly devpass cookie
    res.cookies.set("devpass", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return res;
  } catch (e: any) {
    console.error("[developer:session:end] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to end dev session." },
      { status: 500 },
    );
  }
}