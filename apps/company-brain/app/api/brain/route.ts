import { NextResponse } from "next/server";
import { assembleBrainForEmployee, demoMode, employeeIdParam, liveSource } from "@/lib/brain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = demoMode(searchParams.get("mode"));
  const source = liveSource(searchParams.get("source"));
  const employeeId = employeeIdParam(searchParams.get("employeeId"));
  const state = await assembleBrainForEmployee(employeeId, mode, source);
  return NextResponse.json(state);
}
