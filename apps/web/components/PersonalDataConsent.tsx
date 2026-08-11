import Link from "next/link";
import {
  personalDataConsentPath,
  personalDataConsentVersion,
  privacyPolicyPath,
} from "@/lib/privacy";

export function PersonalDataConsent() {
  return (
    <div className="personal-data-consent">
      <label>
        <input
          name="personal_data_consent"
          required
          type="checkbox"
          value="true"
        />
        <span>
          Я даю <Link href={personalDataConsentPath} rel="noreferrer" target="_blank">согласие на обработку персональных данных</Link>{" "}
          и ознакомлен(а) с <Link href={privacyPolicyPath} rel="noreferrer" target="_blank">Политикой обработки персональных данных</Link>.
        </span>
      </label>
      <input name="consent_version" type="hidden" value={personalDataConsentVersion} />
    </div>
  );
}
