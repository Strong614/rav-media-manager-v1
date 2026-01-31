export function classifyPost(postData) {
  // Event
  if (postData.type === "event") return "event";

  // Roleplay
  if (postData.type === "rp" || postData.type === "roleplay") return "roleplay";

  // Misc activities
  const miscTypes = [
    "Stopping SR",
    "Stopping BR",
    "Stopping PBR",
    "Stopping JB",
    "Securing VIP",
    "Training",
    "Patrolling",
    "Stopping CR"
  ];
  if (miscTypes.includes(postData.activityType)) return "misc";

  // Raid detection (case-insensitive)
  if (postData.activityType?.toLowerCase().includes("raid")) return "raid";

  // Any other activity
  return "activity";
}
