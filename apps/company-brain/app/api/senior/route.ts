import { NextResponse } from "next/server";
import { getSeniorSnapshot } from "@/lib/senior-api";

export async function GET() {
  return NextResponse.json(await getSeniorSnapshot());
}
