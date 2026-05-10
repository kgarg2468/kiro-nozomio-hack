"use server";

import { revalidatePath } from "next/cache";
import {
  analyzeNow,
  recordSeniorDecision,
  updateSeniorConflictStatus
} from "@/lib/senior-api";

export async function forceAnalyzeAction() {
  await analyzeNow();
  revalidatePath("/senior");
}

export async function approveDecisionAction(formData: FormData) {
  const ownerAgentSessionId = String(formData.get("ownerAgentSessionId") ?? "");
  await recordSeniorDecision({
    conflictId: required(formData, "conflictId"),
    selectedOptionId: required(formData, "selectedOptionId"),
    selectedOptionTitle: required(formData, "selectedOptionTitle"),
    selectedOptionDirection: required(formData, "selectedOptionDirection"),
    ...(ownerAgentSessionId ? { ownerAgentSessionId } : {})
  });
  revalidatePath("/senior");
}

export async function updateConflictStatusAction(formData: FormData) {
  await updateSeniorConflictStatus(
    required(formData, "conflictId"),
    required(formData, "status") as "open" | "acknowledged" | "resolved" | "ignored"
  );
  revalidatePath("/senior");
}

function required(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value) {
    throw new Error(`${key} is required`);
  }
  return value;
}
