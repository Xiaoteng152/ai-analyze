import { getLatestEntry, getPreviousEntry } from "@/lib/retrospective-store";
import { RetrospectiveHomeClient } from "@/components/retrospective-home-client";
import { buildMonthlySummary, getDefaultMonth } from "@/lib/monthly-summary";
import { getCollectedItemsByMonth, getMonthlySummary } from "@/lib/source-store";
import { getUserContext } from "@/lib/user-context-store";

export default async function Home() {
  const month = getDefaultMonth();
  const [latestEntry, previousEntry, monthlyItems, storedMonthlySummary, initialUserContext] =
    await Promise.all([
      getLatestEntry(),
      getPreviousEntry(),
      getCollectedItemsByMonth(month),
      getMonthlySummary(month),
      getUserContext(),
    ]);
  const monthlySummary = storedMonthlySummary ?? buildMonthlySummary(month, monthlyItems);

  return (
    <RetrospectiveHomeClient
      initialLatestEntry={latestEntry}
      initialPreviousEntry={previousEntry}
      initialMonth={month}
      initialMonthlySummary={monthlySummary}
      initialMonthlyItems={monthlyItems}
      initialUserContext={initialUserContext}
    />
  );
}
