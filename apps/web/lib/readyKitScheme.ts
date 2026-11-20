import { existsSync } from "node:fs";
import { join } from "node:path";

const schemes: Record<string, string> = {
  "roof-4": "roof-4m-scheme.webp", "roof-6": "roof-6m-scheme.webp",
  "wall-3": "wall-3m-scheme.webp", "wall-6": "wall-6m-scheme.webp",
};

export function readyKitScheme(route: string, height: number): string | null {
  const file = schemes[`${route}-${height}`];
  if (!file) return null;
  const relative = join("images", "ready-kits", file);
  // Native web / standalone starts in apps/web; also support workspace-root runs.
  const exists = [join(process.cwd(), "public", relative), join(process.cwd(), "apps/web/public", relative)]
    .some(path => existsSync(path));
  return exists ? `/images/ready-kits/${file}` : null;
}
