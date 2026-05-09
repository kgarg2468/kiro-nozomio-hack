import { BigScreenOffice } from "@/components/big-screen-office";
import { assembleBrainForEmployee, demoMode, liveSource } from "@/lib/brain";

interface OfficePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OfficePage({ searchParams }: OfficePageProps) {
  const params = await searchParams;
  const source = liveSource(params?.source);
  const state = await assembleBrainForEmployee("sam", demoMode(params?.mode), source);
  return <BigScreenOffice state={state} liveSource={source} />;
}
