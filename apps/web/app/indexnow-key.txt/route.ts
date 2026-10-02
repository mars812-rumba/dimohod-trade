const INDEXNOW_KEY_PATTERN = /^[A-Za-z0-9-]{8,128}$/;

export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  if (!INDEXNOW_KEY_PATTERN.test(key)) {
    return new Response("Not found\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 404,
    });
  }

  return new Response(`${key}\n`, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status: 200,
  });
}
