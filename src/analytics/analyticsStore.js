import { parsePostData } from "../utils/postParser.js";
import { client } from "../client.js";

export const userStats = {};

/**
 * Record a single post with counts and contributors
 */
export function recordPost(postData, date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const monthKey = getMonthKey(d);

  function incrementAuthor(userId) {
    if (!userId || userId === client.user?.id) return;

    if (!userStats[userId]) userStats[userId] = {};
    if (!userStats[userId][monthKey]) userStats[userId][monthKey] = {};

    const monthData = userStats[userId][monthKey];

    // Track posts authored for left graph
    if (!monthData.postsAuthored) monthData.postsAuthored = 0;
    monthData.postsAuthored += 1;

    // Initialize contributors table
    if (!monthData.contributors) {
      monthData.contributors = { misc: [], rp: [], raid: [], event: [] };
    }

    if (!monthData.counts) {
      monthData.counts = { misc: 0, rp: 0, raid: 0, event: 0 };
    }
  }

  function incrementContributor(userId, type) {
    if (!userId || userId === client.user?.id) return;

    if (!userStats[userId]) userStats[userId] = {};
    if (!userStats[userId][monthKey]) userStats[userId][monthKey] = {};

    const monthData = userStats[userId][monthKey];

    if (!monthData.contributors) {
      monthData.contributors = { misc: [], rp: [], raid: [], event: [] };
    }

    if (!monthData.counts) {
      monthData.counts = { misc: 0, rp: 0, raid: 0, event: 0 };
    }

    // Increment contributor count for table
    monthData.counts[type] += 1;

    // Track contributor uniquely
    if (!monthData.contributors[type].includes(userId)) {
      monthData.contributors[type].push(userId);
    }
  }

  switch (postData.type) {
  case "rp":
    incrementAuthor(postData.authorId);
    (postData.participantsArray || []).forEach(uid => incrementContributor(uid, "rp"));
    break;

  case "raid":
    incrementAuthor(postData.authorId);
    (postData.participantsArray || []).forEach(uid => incrementContributor(uid, "raid"));
    break;

  case "misc":
    incrementAuthor(postData.authorId);
    (postData.participantsArray || []).forEach(uid => incrementContributor(uid, "misc"));
    break;

  case "event":
    incrementAuthor(postData.authorId);
    incrementContributor(postData.host || postData.authorId, "event");
    break;

  default:
    incrementAuthor(postData.authorId);
    break;
}

}

/**
 * Bulk record from messages
 */
export function recordPostsFromMessages(messages) {
  messages.forEach(msg => {
    const postData = parsePostData(msg);
    recordPost(postData, msg.createdAt);
  });
}

/**
 * Month key with rollover at 27th
 */
function getMonthKey(date) {
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  if (date.getDate() >= 27) month += 1;
  if (month > 12) month = 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Build leaderboard for a month
 */
export async function getLeaderboard(monthKey, guildId) {
  const guild = await client.guilds.fetch(guildId);

  const entries = await Promise.all(
    Object.entries(userStats)
      .filter(([userId]) => userId !== client.user?.id)
      .map(async ([userId, months]) => {
        const monthData = months[monthKey] || {};
        const total = monthData.postsAuthored || 0; // only authors

        let displayName = userId;
        try {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) displayName = member.displayName;
        } catch {}

        return {
          userId,
          displayName,
          counts: monthData.counts || { misc: 0, rp: 0, raid: 0, event: 0 }, // table counts
          contributors: monthData.contributors || { misc: [], rp: [], raid: [], event: [] },
          total
        };
      })
  );

  return entries
    .filter(u => u.total > 0 || Object.values(u.counts).some(c => c > 0))
    .sort((a, b) => b.total - a.total);
}
