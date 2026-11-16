import type { ChimneyEstimateCustomer } from "./chimneyEstimate";

export type QuickEstimateLead = {
  id: string;
  callbackToken: string;
  customer: ChimneyEstimateCustomer;
  callbackRequested: boolean;
};

export function quickEstimateContact(input: string): { method: "phone" | "telegram"; value: string } | null {
  const value = input.trim();
  const digits = value.replace(/\D/g, "");
  if (/^[+\d\s()\-]{7,40}$/.test(value) && digits.length >= 7 && digits.length <= 15) {
    return { method: "phone", value };
  }
  const username = value.replace(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\//i, "").replace(/\/$/, "");
  if (/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(username)) {
    return { method: "telegram", value: `@${username.replace(/^@/, "")}` };
  }
  return null;
}

export function isQuickEstimateLead(value: unknown): value is QuickEstimateLead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Partial<QuickEstimateLead>;
  return typeof lead.id === "string" && /^[a-f0-9]{32}$/.test(lead.id)
    && typeof lead.callbackToken === "string" && /^[a-zA-Z0-9_-]{32,128}$/.test(lead.callbackToken)
    && typeof lead.customer?.name === "string"
    && ["phone", "telegram"].includes(lead.customer.contactMethod)
    && typeof lead.customer.contact === "string"
    && quickEstimateContact(lead.customer.contact)?.method === lead.customer.contactMethod
    && typeof lead.callbackRequested === "boolean";
}
