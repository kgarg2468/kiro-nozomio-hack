import { DemoCockpit } from "@/components/demo-cockpit";
import { assembleBrainForEmployee, demoMode, liveSource } from "@/lib/brain";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const source = liveSource(params?.source);
  const state = await assembleBrainForEmployee("sam", demoMode(params?.mode), source);
  return <DemoCockpit initialState={state} liveSource={source} />;
}
