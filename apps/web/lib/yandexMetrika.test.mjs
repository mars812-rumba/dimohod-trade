import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../components/YandexMetrika.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../components/YandexMetrika.module.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const cookiePolicy = readFileSync(new URL("../app/cookie-policy/page.tsx", import.meta.url), "utf8");
const privacyPolicy = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");

test("Yandex Metrika loads only after explicit analytics consent", () => {
  assert.match(component, /const counterId = 112054099/);
  assert.match(component, /consent === "accepted"/);
  assert.match(component, /dimohod_analytics_consent_v1/);
  assert.match(component, /Разрешить аналитику/);
  assert.match(component, /Только необходимые/);
  assert.match(component, /pathname\.startsWith\("\/admin"\)/);
  assert.doesNotMatch(component, /<noscript/);
});

test("the requested counter options are preserved", () => {
  for (const option of [
    /ssr: true/,
    /webvisor: true/,
    /clickmap: true/,
    /ecommerce: "dataLayer"/,
    /accurateTrackBounce: true/,
    /trackLinks: true/,
  ]) {
    assert.match(component, option);
  }
  assert.match(component, /mc\.yandex\.ru\/metrika\/tag\.js/);
});

test("the counter is global, accessible and disclosed", () => {
  assert.match(layout, /<YandexMetrika \/>/);
  assert.match(component, /aria-labelledby="analytics-consent-title"/);
  assert.match(styles, /\.actions button:focus-visible/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(cookiePolicy, /счётчик № 112054099/);
  assert.match(privacyPolicy, /счётчик № 112054099/);
});
