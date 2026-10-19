"use server";

import { redirect } from "next/navigation";
import { runWrite } from "@/lib/entities/run-write";
import * as profile from "@/lib/entities/profile";

export interface OnboardingResult {
  error?: string;
}

// A thin adapter over lib/entities/profile; see settings/actions.ts.
export async function completeOnboarding(
  savingsBalance: number,
  monthlySalary: number
): Promise<OnboardingResult> {
  const result = await runWrite((client, userId) =>
    profile.completeOnboarding(client, userId, savingsBalance, monthlySalary)
  );
  if (!result.ok) {
    return { error: result.error };
  }
  redirect("/dashboard");
}
