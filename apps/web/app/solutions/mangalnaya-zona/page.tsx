import type { Metadata } from "next";
import { MangalScenarioLanding } from "@/components/MangalScenarioLanding";
import { mangalScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(mangalScenario);

export default function MangalScenarioPage() {
  return <MangalScenarioLanding assetBasePath={assetBasePath} />;
}
