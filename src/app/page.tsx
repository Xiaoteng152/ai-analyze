import { getLatestEntry, getPreviousEntry } from "@/lib/retrospective-store";
import { RetrospectiveHomeClient } from "@/components/retrospective-home-client";
import { buildMonthlySummary, getDefaultMonth } from "@/lib/monthly-summary";
import { getCollectedItemsByMonth, getMonthlySummary } from "@/lib/source-store";

export default async function Home() {
  const month = getDefaultMonth();
  const [latestEntry, previousEntry, monthlyItems, storedMonthlySummary] = await Promise.all([
    getLatestEntry(),
    getPreviousEntry(),
    getCollectedItemsByMonth(month),
    getMonthlySummary(month),
  ]);
  const monthlySummary = storedMonthlySummary ?? buildMonthlySummary(month, monthlyItems);

  return (
    <RetrospectiveHomeClient
      initialLatestEntry={latestEntry}
      initialPreviousEntry={previousEntry}
      initialMonth={month}
      initialMonthlySummary={monthlySummary}
      initialMonthlyItems={monthlyItems}
    />
  );
}
