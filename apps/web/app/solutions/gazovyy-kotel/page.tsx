import type { Metadata } from "next";
import { ScenarioPageTemplate } from "@/components/ScenarioPageTemplate";
import { gasBoilerScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(gasBoilerScenario);

export default function GasBoilerScenarioPage() {
  return <ScenarioPageTemplate content={gasBoilerScenario} assetBasePath={assetBasePath} />;
}
