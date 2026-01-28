import { classifyPost } from "./classifyPost.js";
import { parsePostData } from "../utils/postParser.js";

// Per-month stats store
export const activityStats = {};

/* ───────── Rav Month Helpers ───────── */

export function getCurrentRavMonthKey(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d)) throw new Error("Invalid date passed to getCurrentRavMonthKey");

  let year = d.getFullYear();
  let month = d.getMonth() + 1;

  if (d.getDate() < 27) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function getRavMonthRange(monthKey) {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  let startMonth = month - 1;
  let startYear = year;
  if (startMonth < 1) {
    startMonth = 12;
    startYear -= 1;
  }

  const start = new Date(startYear, startMonth - 1, 27, 0, 0, 0, 0);
  const end = new Date(year, month - 1, 26, 23, 59, 59, 999);

  return { start, end };
}

function isDateInRavMonth(date, monthKey) {
  if (!date) return false;
  const d = new Date(date);
  const { start, end } = getRavMonthRange(monthKey);
  return d >= start && d <= end;
}

/* ───────── Core Recording ───────── */

export function recordActivityPost(postData, monthKey) {
  const category = classifyPost(postData);

  if (!activityStats[monthKey]) activityStats[monthKey] = { all: {}, users: {} };
  const monthStats = activityStats[monthKey];

  const categories = ["misc", "event", "roleplay", "raid", "activity"];
  for (const cat of categories) if (!(cat in monthStats.all)) monthStats.all[cat] = 0;

  monthStats.all[category] += 1;

  for (const p of postData.participantsArray) {
    if (!monthStats.users[p]) monthStats.users[p] = { misc: 0, event: 0, roleplay: 0, raid: 0, activity: 0 };
    monthStats.users[p][category] += 1;
  }

  console.log(`[DEBUG] [${monthKey}] Recorded post: ${category}`);
}

/* ───────── Bulk Recording ───────── */

export function recordActivityFromMessages(messages, { reset = false } = {}) {
  messages.forEach((msg) => {
    try {
      const postData = parsePostData(msg);
      const monthKey = getCurrentRavMonthKey(msg.createdAt); // <-- assign correct Rav month

      if (reset || !activityStats[monthKey]) activityStats[monthKey] = { all: {}, users: {} };
      recordActivityPost(postData, monthKey);
    } catch (err) {
      console.warn("[DEBUG] Failed to parse message:", msg.id, err);
    }
  });
}
