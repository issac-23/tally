import type { Recurrence } from "@/lib/utils/recurrence";

export type { Recurrence };

export type RunwayStatus = "green" | "yellow" | "orange" | "red";

export interface Profile {
  id: string;
  user_id: string;
  savings_balance: number;
  monthly_salary: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null; // null = preset/global category
  name: string;
  color: string;
  icon: string;
  is_preset: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id: string;
  merchant: string;
  date: string; // ISO date string
  recurrence: Recurrence;
  created_at: string;
  category?: Category;
}

export interface SpendingSummary {
  today: number;
  this_week: number;
  this_month: number;
}

export interface RunwayInfo {
  months_remaining: number;
  status: RunwayStatus;
  label: string;
  monthly_budget_limit: number;
  monthly_avg_spend: number;
}
