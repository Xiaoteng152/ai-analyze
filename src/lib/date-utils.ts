export function getMonthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function getMonthDateRange(month: string): { since: string; until: string } {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const since = new Date(Date.UTC(year, monthIndex, 1));
  const until = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    since: since.toISOString(),
    until: until.toISOString(),
  };
}
