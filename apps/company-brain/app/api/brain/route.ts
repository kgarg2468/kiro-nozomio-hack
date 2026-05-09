import { NextResponse } from "next/server";
import { assembleBrainForEmployee } from "@/lib/brain";

export async function GET() {
  const state = await assembleBrainForEmployee("sam");
  return NextResponse.json(state);
}
