import { DemoCockpit } from "@/components/demo-cockpit";
import { assembleBrainForEmployee } from "@/lib/brain";

export default async function HomePage() {
  const state = await assembleBrainForEmployee("sam");
  return <DemoCockpit initialState={state} />;
}
