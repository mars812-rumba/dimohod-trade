import type { Metadata } from "next";
import { PechScenarioLanding } from "@/components/PechScenarioLanding";
import { pechScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(pechScenario);

export default function PechScenarioPage() {
  return <PechScenarioLanding assetBasePath={assetBasePath} />;
}
