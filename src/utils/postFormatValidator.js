// utils/enforcePostFormat.js

// Required fields for each post type
export const REQUIRED_FIELDS = {
  activity: ["Activity type:", "Post Number:", "Participants:", "Date:"],
  event: ["Event Type:", "Event Price:", "Post Number:", "Host:", "Winner:", "Date:"],
  rp: ["Roleplay Story:", "Roleplay Participants:", "Post Number:", "Date:"]
};

// Template (blank) per post type
export const TEMPLATE = {
  activity: `Activity type:\nPost Number:\nParticipants:\nDate:`,
  event: `Event Type:\nEvent Price:\nPost Number:\nHost:\nWinner:\nDate:`,
  rp: `Roleplay Story:\nRoleplay Participants:\nPost Number:\nDate:`
};

// Example per post type
export const EXAMPLES = {
  activity: `Activity type: Stopping SR\nPost Number: #580\nParticipants: LightSide, Strong & Alvarez\nDate: 12-01-2026`,
  event: `Event Type: LMS\nEvent Price: 1.000.000$\nPost Number: #581\nHost: LightSide\nWinner: Zynox\nDate: 12-01-2026`,
  rp: `Roleplay Story: The adventure begins...\nRoleplay Participants: LightSide, Strong & Alvarez\nPost Number: #582\nDate: 12-01-2026`
};

// Detect post type
export function detectPostType(content) {
  const lines = content.split("\n");
  if (lines.some(l => l.startsWith("Roleplay Story:"))) return "rp";
  if (lines.some(l => l.startsWith("Event Type:"))) return "event";
  return "activity";
}

// Check for missing or placeholder fields

export function checkPostFormat(content) {
  const type = detectPostType(content);
  const required = REQUIRED_FIELDS[type];

  const lines = content.split("\n");
  const missingOrEmpty = [];

  for (const field of required) {
    const line = lines.find(l => l.startsWith(field));
    if (!line) {
      missingOrEmpty.push(field);
    } else {
      const value = line.replace(field, "").trim();
      if (!value || value === "#" || value === "$") {
        missingOrEmpty.push(field);
      }
    }
  }

  return { type, missingOrEmpty };
}


// Main validator
export async function enforcePostFormat(message, autoDeleted = false) {
  const { type, missingOrEmpty } = checkPostFormat(message.content);

  if (missingOrEmpty.length > 0) {
    try {
      const footerText = autoDeleted
        ? `Please fix these fields and re-submit your post`
        : `Your post will still be reviewed by a Media Manager, but please fix these fields for future submissions.`;

      await message.author.send(
        `<@${message.author.id}>, your ${type} post has invalid or missing fields:\n` +
        `${missingOrEmpty.map(f => `- ${f}`).join("\n")}\n\n` +
        `📋 **Correct format:**\n` +
        "```" + TEMPLATE[type] + "```\n\n" +
        `**Example:**\n` +
        "```" + EXAMPLES[type] + "```\n" +
        `${footerText}`
      );

      console.log(`DM sent to ${message.author.tag} for invalid ${type} format.`);
    } catch (err) {
      console.warn(`Could not DM ${message.author.tag}:`, err.message);
    }

    return false;
  }

  return true;
}
