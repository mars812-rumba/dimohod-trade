import type { Metadata } from "next";
import { ScenarioPageTemplate } from "@/components/ScenarioPageTemplate";
import { pechScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(pechScenario);

export default function PechScenarioPage() {
  return <ScenarioPageTemplate content={pechScenario} assetBasePath={assetBasePath} />;
}
