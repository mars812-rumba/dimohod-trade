import type { Metadata } from "next";
import { KaminScenarioLanding } from "@/components/KaminScenarioLanding";
import { kaminScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(kaminScenario);

export default function KaminScenarioPage() {
  return <KaminScenarioLanding assetBasePath={assetBasePath} />;
}
