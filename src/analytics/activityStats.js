import { classifyPost } from "./classifyPost.js";
import { parsePostData } from "../utils/postParser.js"; // your parser

// Stores all stats under a single "all" key for now
export const activityStats = {};

/**
 * Record a single post
 */
export function recordActivityPost(postData) {
  const category = classifyPost(postData);

  // Ensure structure exists
  if (!activityStats["all"]) activityStats["all"] = {};
  if (!activityStats["users"]) activityStats["users"] = {};

  const categories = ["misc", "event", "roleplay", "raid", "activity"];
  for (const cat of categories) {
    if (!(cat in activityStats["all"])) activityStats["all"][cat] = 0;
  }

  // global category count
  activityStats["all"][category] += 1;

  // --- PER-USER COUNT FIX HERE ---
  for (const p of postData.participantsArray) {
    if (!activityStats["users"][p]) {
      activityStats["users"][p] = { misc: 0, event: 0, roleplay: 0, raid: 0 };
    }

    // only increment the four main public categories
    if (category in activityStats["users"][p]) {
      activityStats["users"][p][category] += 1;
    }
  }

  console.log(`[DEBUG] Recorded post: Category=${category}, Users=${postData.participantsArray}`);
}


/**
 * Bulk record from messages
 */
export function recordActivityFromMessages(messages) {
  messages.forEach((msg) => {
    try {
      const postData = parsePostData(msg);
      console.log("[DEBUG] Parsed postData:", postData);
      recordActivityPost(postData);
    } catch (err) {
      console.warn("[DEBUG] Failed to parse message:", msg.id, err);
    }
  });
}
