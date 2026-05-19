import { matchParticipantName } from "./nameMatcher.js";

// Make this function async now
export async function parsePostData(message) {
  const lines = message.content.split("\n").map(l => l.trim());
  const postData = {
    postNumber: "",
    participants: "",
    date: "",
    activityType: "",
    eventType: "",
    eventPrice: "",
    host: "",
    winner: "",
    story: "",
    roleplayParticipants: "",
    type: "activity",
    screenshotUrls: [...message.attachments.values()].map(a => a.url),
    authorId: message.author.id,
    participantsArray: []
  };

  // Detect type
  if (lines.some(l => l.startsWith("Roleplay Story:"))) {
    postData.type = "rp";
  } else if (lines.some(l => l.startsWith("Event Type:"))) {
    postData.type = "event";
  } else if (lines.some(l => l.startsWith("Activity type:"))) {
    const activityLine = lines.find(l => l.startsWith("Activity type:"));
    const activityStr = activityLine.replace("Activity type:", "").trim();
    if (activityStr.toLowerCase().includes("raid")) {
      postData.type = "raid";
    } else {
      postData.type = "misc";
    }
    postData.activityType = activityStr;
  }

  // Parse fields
  for (const line of lines) {
    if (line.startsWith("Post Number:")) postData.postNumber = line.replace("Post Number:", "").trim();
    
    if (line.startsWith("Participants:") && !line.includes("Activity type:"))
      postData.participants = line.replace("Participants:", "").trim();
    if (line.startsWith("Roleplay Participants:")) 
      postData.roleplayParticipants = line.replace("Roleplay Participants:", "").trim();
    if (line.startsWith("Date:")) postData.date = line.replace("Date:", "").trim();
    if (line.startsWith("Activity type:") && !postData.activityType) 
      postData.activityType = line.replace("Activity type:", "").trim();
    if (line.startsWith("Event Type:")) postData.eventType = line.replace("Event Type:", "").trim();
    if (line.startsWith("Event Price:")) postData.eventPrice = line.replace("Event Price:", "").trim();
    if (line.startsWith("Host:")) postData.host = line.replace("Host:", "").trim();
    if (line.startsWith("Winner:")) postData.winner = line.replace("Winner:", "").trim();
    if (line.startsWith("Roleplay Story:")) postData.story = line.replace("Roleplay Story:", "").trim();
  }

  // Normalize participants for RP
  if (postData.type === "rp") {
    postData.participants = postData.roleplayParticipants || "";
  }

  // Split participants robustly + fuzzy match names
  if (postData.participants) {
    const normalized = postData.participants
      .replace(/\s+(and)\s+/gi, ",")       // "and" → ","
      .replace(/\s*\/\s*/g, ",")            // "/" → ","
      .replace(/\s*&\s*/g, ",")             // "&" → ","
      .replace(/\s{2,}/g, " ")              // collapse spaces
      .trim();
    
    const rawNames = normalized
      .split(",")
      .map(p => p.trim())
      .filter(p => p);
    
    // Fuzzy match all participant names (async)
    postData.participantsArray = await Promise.all(
      rawNames.map(p => matchParticipantName(p))
    );
  }

  // Split and fuzzy match host and winner the same way as participants
  if (postData.host) {
    const normalized = postData.host
      .replace(/\s+(and)\s+/gi, ",")
      .replace(/\s*\/\s*/g, ",")
      .replace(/\s*&\s*/g, ",")
      .replace(/\s{2,}/g, " ")
      .trim();
    const rawHosts = normalized.split(",").map(p => p.trim()).filter(p => p);
    postData.hostArray = await Promise.all(rawHosts.map(p => matchParticipantName(p)));
    postData.host = postData.hostArray.join(", ");
  }

  if (postData.winner) {
    postData.winner = await matchParticipantName(postData.winner);
  }

  return postData;
}

// Helper function to capitalize first letter of each word (kept for backward compatibility)
function capitalizeFirstLetter(str) {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}