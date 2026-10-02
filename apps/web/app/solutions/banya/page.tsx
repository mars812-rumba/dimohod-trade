import type { Metadata } from "next";
import { BanyaScenarioLanding } from "@/components/BanyaScenarioLanding";
import { banyaScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(banyaScenario);

export default function BanyaScenarioPage() {
  return <BanyaScenarioLanding assetBasePath={assetBasePath} />;
}
