// Shared by the submit form (browser) and the server-side checks, so both
// always agree on the allowed values and limits.

export const CATEGORIES = [
  "party",
  "academic",
  "sports",
  "arts",
  "career",
  "cultural",
  "social",
  "other",
] as const;

export const CAMPUSES = ["SGW", "Loyola", "Off-campus", "Online"] as const;

export const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

export const LIMITS = {
  clubName: 100,
  title: 120,
  description: 3000,
  location: 150,
  url: 500,
  email: 200,
  posterBytes: 4 * 1024 * 1024, // 4 MB (after in-browser shrinking)
  maxRepeatDays: 120, //           a weekly event can run ~4 months
  maxDates: 60,
  maxDaysAhead: 365,
  maxPriceDollars: 1000,
} as const;

// What the form gets back after submitting.
export type SubmitState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      errors: Record<string, string>;
      values: Record<string, string | string[]>;
    }
  | { status: "success"; title: string; dates: string[] };
