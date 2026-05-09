import { BigScreenOffice } from "@/components/big-screen-office";
import { getFixtureDemoState } from "@/lib/demo-data";

export default function OfficePage() {
  return <BigScreenOffice state={getFixtureDemoState()} />;
}
