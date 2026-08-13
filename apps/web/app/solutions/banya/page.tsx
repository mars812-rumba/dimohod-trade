import type { Metadata } from "next";
import { ScenarioPageTemplate } from "@/components/ScenarioPageTemplate";
import { banyaScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(banyaScenario);

export default function BanyaScenarioPage() {
  return <ScenarioPageTemplate content={banyaScenario} assetBasePath={assetBasePath} />;
}
