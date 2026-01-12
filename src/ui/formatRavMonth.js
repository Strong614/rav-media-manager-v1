export function formatRavMonth(monthKey) {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-12

  // Start date is 27th of previous month
  let startMonth = month - 1;
  let startYear = year;
  if (startMonth < 1) {
    startMonth = 12;
    startYear -= 1;
  }
  const startDate = new Date(startYear, startMonth - 1, 27);

  // End date is 26th of this month
  const endDate = new Date(year, month - 1, 26);

  const options = { month: "short" };
  const startStr = `${startDate.getDate()}${getOrdinal(startDate.getDate())} ${startDate.toLocaleString("en-US", options)}${startDate.getFullYear() !== year ? ' ' + startDate.getFullYear() : ''}`;
  const endStr = `${endDate.getDate()}${getOrdinal(endDate.getDate())} ${endDate.toLocaleString("en-US", options)} ${endDate.getFullYear()}`;

  return `${startStr} to ${endStr}`;
}

// Helper for ordinal suffix
function getOrdinal(n) {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
