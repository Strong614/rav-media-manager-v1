import { classifyPost } from "./classifyPost.js";
import { parsePostData } from "../utils/postParser.js";

// Per-month stats store
export const activityStats = {};

/* ───────── Unified Rav Month Helpers ───────── */
export function getCurrentRavMonthKey(date = new Date()) {
  const d = new Date(date);
  if (isNaN(d)) throw new Error("Invalid date passed to getCurrentRavMonthKey");

  let year = d.getFullYear();
  let month = d.getMonth() + 1; // 1-12

  // Match analyticsStore: if day >= 27, month rolls over
  if (d.getDate() >= 27) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

/* ───────── Core Recording ───────── */
export function recordActivityPost(postData, monthKey) {
  if (!monthKey) monthKey = getCurrentRavMonthKey(postData.date || new Date());
  const category = classifyPost(postData);

  // Ensure per-month structure
  if (!activityStats[monthKey]) activityStats[monthKey] = { all: {}, users: {} };
  const monthStats = activityStats[monthKey];

  const categories = ["misc", "event", "roleplay", "raid", "activity"];
  for (const cat of categories) if (!(cat in monthStats.all)) monthStats.all[cat] = 0;

  // Increment global count
  monthStats.all[category] += 1;

  // Increment per-user counts
  for (const p of postData.participantsArray || []) {
    if (!monthStats.users[p]) monthStats.users[p] = { misc: 0, event: 0, roleplay: 0, raid: 0, activity: 0 };
    monthStats.users[p][category] += 1;
  }

  // Update total
  monthStats.all.activity = Object.values(monthStats.all).reduce((sum, val) => sum + val, 0);
}

/* ───────── Bulk Recording ───────── */
export function recordActivityFromMessages(messages, { reset = false } = {}) {
  messages.forEach(msg => {
    try {
      const postData = parsePostData(msg);
      const monthKey = getCurrentRavMonthKey(msg.createdAt); // always per-message date

      if (reset || !activityStats[monthKey]) activityStats[monthKey] = { all: {}, users: {} };
      recordActivityPost(postData, monthKey);
    } catch (err) {
      console.warn(`[DEBUG] Failed to record message ${msg.id}:`, err);
    }
  });
}
export { getRavMonthRange };
