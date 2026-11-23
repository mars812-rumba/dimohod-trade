"use client";

import { useId, useState } from "react";
import { CONTACT_METHOD_OPTIONS, type PhoneContactMethod } from "@/lib/quickEstimateLead";
import styles from "./PhoneContactFields.module.css";

export function PhoneContactFields({ describedBy, disabled = false }: { describedBy?: string; disabled?: boolean }) {
  const id = useId();
  const [method, setMethod] = useState<PhoneContactMethod>("phone");
  const selected = CONTACT_METHOD_OPTIONS.find(option => option.value === method)!;
  return <div className={styles.fields}>
    <label htmlFor={`${id}-method`}>
      <span>Способ связи</span>
      <select id={`${id}-method`} name="contact_method" value={method} disabled={disabled}
        onChange={event => setMethod(event.target.value as PhoneContactMethod)}>
        {CONTACT_METHOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <label htmlFor={`${id}-number`}>
      <span>{selected.inputLabel}</span>
      <input id={`${id}-number`} name="contact" type="tel" inputMode="tel" autoComplete="tel"
        minLength={7} maxLength={40} required disabled={disabled} placeholder="+7 999 000-00-00" aria-describedby={describedBy} />
    </label>
  </div>;
}
