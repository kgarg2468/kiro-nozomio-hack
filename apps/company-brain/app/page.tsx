import { DemoCockpit } from "@/components/demo-cockpit";
import { assembleBrainForEmployee } from "@/lib/brain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await assembleBrainForEmployee("sam");
  return <DemoCockpit initialState={state} />;
}
