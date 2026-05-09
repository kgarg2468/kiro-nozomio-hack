import { DemoCockpit } from "@/components/demo-cockpit";
import { getFixtureDemoState } from "@/lib/demo-data";

export default function HomePage() {
  return <DemoCockpit initialState={getFixtureDemoState()} />;
}
