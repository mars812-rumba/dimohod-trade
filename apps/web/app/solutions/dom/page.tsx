import type { Metadata } from "next";
import { HomeScenarioLanding } from "@/components/HomeScenarioLanding";
import { homeScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(homeScenario);

export default function HomeScenarioPage() {
  return <HomeScenarioLanding assetBasePath={assetBasePath} />;
}
