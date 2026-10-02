#!/usr/bin/env node

const key = process.env.INDEXNOW_KEY?.trim() ?? "";
const siteUrl = process.env.YANDEX_WEBMASTER_HOST_URL
  ?? process.env.NEXT_PUBLIC_APP_URL
  ?? "https://dimohod-trade.pro";
const keyPattern = /^[A-Za-z0-9-]{8,128}$/;

if (!keyPattern.test(key)) {
  throw new Error("INDEXNOW_KEY must contain 8–128 letters, digits or hyphens.");
}

const origin = new URL(siteUrl).origin;
const urls = [...new Set(process.argv.slice(2).map((value) => new URL(value, origin).toString()))];
if (urls.length === 0) {
  throw new Error("Pass at least one new, changed or deleted public URL.");
}
if (urls.length > 10_000) {
  throw new Error("IndexNow accepts no more than 10,000 URLs per request.");
}
for (const url of urls) {
  if (new URL(url).origin !== origin) {
    throw new Error(`URL does not belong to ${origin}: ${url}`);
  }
}

const response = await fetch("https://yandex.com/indexnow", {
  body: JSON.stringify({
    host: new URL(origin).host,
    key,
    keyLocation: new URL("/indexnow-key.txt", origin).toString(),
    urlList: urls,
  }),
  headers: { "Content-Type": "application/json; charset=utf-8" },
  method: "POST",
});

if (response.status !== 200 && response.status !== 202) {
  const detail = (await response.text()).trim();
  throw new Error(`IndexNow rejected the request (${response.status})${detail ? `: ${detail}` : "."}`);
}

process.stdout.write(
  `${response.status === 200 ? "IndexNow accepted" : "IndexNow queued key verification for"} ${urls.length} URL(s).\n`,
);
