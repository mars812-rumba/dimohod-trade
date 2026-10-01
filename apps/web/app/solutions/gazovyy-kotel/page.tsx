import type { Metadata } from "next";
import { BoilerScenarioLanding } from "@/components/BoilerScenarioLanding";
import { gasBoilerScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(gasBoilerScenario);

export default function GasBoilerScenarioPage() {
  return <BoilerScenarioLanding assetBasePath={assetBasePath} kind="gas" />;
}
