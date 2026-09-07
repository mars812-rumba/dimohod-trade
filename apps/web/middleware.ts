import { NextRequest, NextResponse } from "next/server";

const adminCookie = "dimohod_admin_session";
const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000";

function productReference(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).at(-1);
  if (!segment) return null;
  const match = segment.match(/^(.*)-d(\d+)(?:-(\d+))?$/);
  return match
    ? { slug: match[1], diameter: `${match[2]}:${match[3] ?? ""}` }
    : { slug: segment, diameter: null };
}

async function productExists(request: NextRequest) {
  const reference = productReference(request.nextUrl.pathname);
  if (!reference) return true;
  const url = new URL(
    `/api/v1/products/resolve/${encodeURIComponent(reference.slug)}`,
    apiBaseUrl,
  );
  if (reference.diameter) url.searchParams.set("diameter", reference.diameter);
  const sku = request.nextUrl.searchParams.get("sku");
  if (sku) url.searchParams.set("sku", sku);
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.status !== 404 && response.status !== 422;
  } catch {
    // Do not hide the catalog during a transient internal API failure. The
    // page itself will render its normal error handling and monitoring signal.
    return true;
  }
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes("/product/")) {
    if (await productExists(request)) return NextResponse.next();
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = `${request.nextUrl.basePath}/_not-found`;
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  }

  if (request.cookies.has(adminCookie)) return NextResponse.next();
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/catalog/:path*",
    "/admin/customers/:path*",
    "/product/:path*",
  ],
};
