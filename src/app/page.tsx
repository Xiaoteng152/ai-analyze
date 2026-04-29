import { getLatestEntry, getPreviousEntry } from "@/lib/retrospective-store";
import { RetrospectiveHomeClient } from "@/components/retrospective-home-client";

export default async function Home() {
  const [latestEntry, previousEntry] = await Promise.all([
    getLatestEntry(),
    getPreviousEntry(),
  ]);

  return (
    <RetrospectiveHomeClient
      initialLatestEntry={latestEntry}
      initialPreviousEntry={previousEntry}
    />
  );
}
