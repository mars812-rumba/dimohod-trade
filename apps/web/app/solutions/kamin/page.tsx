import type { Metadata } from "next";
import { ScenarioPageTemplate } from "@/components/ScenarioPageTemplate";
import { kaminScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(kaminScenario);

export default function KaminScenarioPage() {
  return <ScenarioPageTemplate content={kaminScenario} assetBasePath={assetBasePath} />;
}
