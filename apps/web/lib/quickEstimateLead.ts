import type { ChimneyEstimateCustomer } from "./chimneyEstimate";

export type QuickEstimateLead = {
  id: string;
  callbackToken: string;
  customer: ChimneyEstimateCustomer;
  callbackRequested: boolean;
};

export const CONTACT_METHOD_OPTIONS = [
  { value: "phone", label: "Телефон", inputLabel: "Номер телефона" },
  { value: "max", label: "MAX", inputLabel: "Номер MAX" },
  { value: "whatsapp", label: "WhatsApp", inputLabel: "Номер WhatsApp" },
] as const;
export type PhoneContactMethod = typeof CONTACT_METHOD_OPTIONS[number]["value"];

export function quickEstimateContact(input: string, method: unknown = "phone"): { method: PhoneContactMethod; value: string } | null {
  if (!CONTACT_METHOD_OPTIONS.some(option => option.value === method)) return null;
  const value = input.trim();
  const digits = value.replace(/\D/g, "");
  if (/^[+\d\s()\-]{7,40}$/.test(value) && digits.length >= 7 && digits.length <= 15) {
    return { method: method as PhoneContactMethod, value };
  }
  return null;
}

export function isQuickEstimateLead(value: unknown): value is QuickEstimateLead {
  if (!value || typeof value !== "object") return false;
  const lead = value as Partial<QuickEstimateLead>;
  return typeof lead.id === "string" && /^[a-f0-9]{32}$/.test(lead.id)
    && typeof lead.callbackToken === "string" && /^[a-zA-Z0-9_-]{32,128}$/.test(lead.callbackToken)
    && typeof lead.customer?.name === "string"
    && typeof lead.customer.contact === "string"
    && quickEstimateContact(lead.customer.contact, lead.customer.contactMethod)?.method === lead.customer.contactMethod
    && typeof lead.callbackRequested === "boolean";
}
