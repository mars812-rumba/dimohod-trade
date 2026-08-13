import type { Metadata } from "next";
import { ScenarioPageTemplate } from "@/components/ScenarioPageTemplate";
import { homeScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(homeScenario);

export default function HomeScenarioPage() {
  return <ScenarioPageTemplate content={homeScenario} assetBasePath={assetBasePath} />;
}
