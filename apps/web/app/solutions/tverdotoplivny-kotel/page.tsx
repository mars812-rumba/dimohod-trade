import type { Metadata } from "next";
import { BoilerScenarioLanding } from "@/components/BoilerScenarioLanding";
import { solidFuelBoilerScenario } from "@/lib/scenarioPages";
import { scenarioMetadata } from "@/lib/scenarioMetadata";

const assetBasePath = process.env.NEXT_BASE_PATH ?? "";

export const metadata: Metadata = scenarioMetadata(solidFuelBoilerScenario);

export default function SolidFuelBoilerScenarioPage() {
  return <BoilerScenarioLanding assetBasePath={assetBasePath} kind="solid-fuel" />;
}
