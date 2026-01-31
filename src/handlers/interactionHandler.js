import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  InteractionType,
  ComponentType,
  TextDisplayBuilder,
  MessageFlags
} from "discord.js";

import {
  APPROVE_BUTTON_ID,
  REJECT_BUTTON_ID,
  DELETE_BUTTON_ID,
  EDIT_BUTTON_ID,
  DELETE_MIRRORED_BUTTON_ID,
  CONFIRM_DELETE_MIRRORED_YES,
  CONFIRM_DELETE_MIRRORED_NO,
  createDeleteRow,
  createModMirroredRow,
  createConfirmDeleteMirroredRow
} from "../ui/actionRow.js";


import { EmbedBuilder } from "discord.js";
import { generatePostComponents } from "../formatting/postComponents.js";
import { client } from "../client.js";
import { recordPost } from "../analytics/analyticsStore.js"; 
import { ravLeaderboardCommand } from "../commands/ravLeaderboard.js";
import { ravActivityCommand } from "../commands/rav-activity.js";
import { enforcePostFormat } from "../utils/postFormatValidator.js"; 
import { TEMPLATE, EXAMPLES, detectPostType } from "../utils/postFormatValidator.js";

import { setMirroredPost, getMirroredPost, deleteMirroredPost } from "../storage/mirroredPosts.js";

const MEDIA_MANAGER_ROLE = "Media Manager";


// Helper to disable buttons (your existing code)
function disableButtons(message) {
  return message.components.map(row => {
    const newRow = new ActionRowBuilder();
    for (const component of row.components) {
      if (component.type === ComponentType.Button) {
        newRow.addComponents(
          ButtonBuilder.from(component).setDisabled(true)
        );
      }
    }
    return newRow;
  });
}

// Parse post data (your existing code)
function parsePostData(message) {
  const lines = message.content.split("\n");
  const postData = {};
  let postType;

  // Determine post type
  if (lines.some(line => line.startsWith("Roleplay Story:"))) {
    postType = "rp";
  } else if (lines.some(line => line.startsWith("Event Type:"))) {
    postType = "event";
  } else {
    postType = "activity";
  }

  for (const line of lines) {
    if (!postData.postNumber && line.startsWith("Post Number:")) {
      postData.postNumber = line.replace("Post Number:", "").trim();
    }

    if (!postData.date && line.startsWith("Date:")) {
      postData.date = line.replace("Date:", "").trim();
    }

    if (!postData.activityType && line.startsWith("Activity type:")) {
      postData.activityType = line.replace("Activity type:", "").trim();
    }

    if (!postData.participants && line.startsWith("Participants:")) {
      postData.participants = line.replace("Participants:", "").trim();
    }

    if (!postData.eventType && line.startsWith("Event Type:")) {
      postData.eventType = line.replace("Event Type:", "").trim();
    }

    if (!postData.eventPrice && line.startsWith("Event Price:")) {
      postData.eventPrice = line.replace("Event Price:", "").trim();
    }

    if (!postData.host && line.startsWith("Host:")) {
      postData.host = line.replace("Host:", "").trim();
    }

    if (!postData.winner && line.startsWith("Winner:")) {
      postData.winner = line.replace("Winner:", "").trim();
    }

    // Roleplay-specific
    if (!postData.story && line.startsWith("Roleplay Story:")) {
      postData.story = line.replace("Roleplay Story:", "").trim();
    }

    if (!postData.participants && line.startsWith("Roleplay Participants:")) {
      postData.participants = line.replace("Roleplay Participants:", "").trim();
    }
  }

  postData.type = postType;
  postData.screenshotUrls = [...message.attachments.values()].map(a => a.url);
  postData.authorId = message.author.id;

  return postData;
}


// Main interaction handler
export async function handleInteraction(interaction) {

  // Permission check (existing)
  if (
  interaction.isButton() &&
  !interaction.member.roles.cache.some(r => r.name === MEDIA_MANAGER_ROLE)
) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  return interaction.editReply("❌ You are not allowed to perform this action (only RAV media managers).");
}


// ───────── BUTTON INTERACTIONS ─────────
if (interaction.isButton()) {

  // 🔥 ACK IMMEDIATELY (this is the fix)
  if (
    interaction.customId === APPROVE_BUTTON_ID ||
    interaction.customId === REJECT_BUTTON_ID ||
    interaction.customId === DELETE_BUTTON_ID
  ) {
    await interaction.deferUpdate();
  }

  if (
    interaction.customId === EDIT_BUTTON_ID ||
    interaction.customId === DELETE_MIRRORED_BUTTON_ID ||
    interaction.customId.startsWith(CONFIRM_DELETE_MIRRORED_YES) ||
    interaction.customId.startsWith(CONFIRM_DELETE_MIRRORED_NO)
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const botMessage = interaction.message;


  // ───────── CONFIRM DELETE MIRRORED: CANCEL ─────────
  if (interaction.customId.startsWith(CONFIRM_DELETE_MIRRORED_NO)) {
    return interaction.editReply({
      content: "❎ Delete cancelled.",
      components: []
    });


  }

// ───────── CONFIRM DELETE MIRRORED: YES ─────────
if (interaction.customId.startsWith(CONFIRM_DELETE_MIRRORED_YES)) {

  // ✅ Extract SOURCE post ID (not mod log ID)
  const [, sourceId] = interaction.customId.split(":");

  // ✅ Fetch mirrored mapping using SOURCE ID
  const mapping = await getMirroredPost(sourceId);
  if (!mapping) return interaction.editReply("❌ No mirrored post found");

  const targetId = mapping.mirroredId;

  try {
    const targetChannel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
    const targetMsg = await targetChannel.messages.fetch(targetId);

    // ✅ Delete mirrored Discord message
    await targetMsg.delete();

    // ✅ Delete from LowDB to prevent stale mappings
    await deleteMirroredPost(sourceId);

    return interaction.editReply("🗑️ Mirrored post deleted successfully.");
  } catch (err) {
    console.error(err);
    return interaction.editReply("❌ Failed to delete mirrored post.");
  }
}

// ───────── FETCH SOURCE MESSAGE (ONLY FOR NORMAL BUTTONS) ─────────
const sourceMessage = botMessage.reference
  ? await interaction.channel.messages
      .fetch(botMessage.reference.messageId)
      .catch(() => null)
  : null;

if (!sourceMessage) {
  return interaction.editReply({
    content: "❌ Original post not found.",
    components: []
  });
}


/* ───────── APPROVE ───────── */
if (interaction.customId === APPROVE_BUTTON_ID) {

  if (botMessage.components.length) {
    await botMessage.edit({
      components: disableButtons(botMessage)
    });
  }

  const postData = parsePostData(sourceMessage);
  recordPost(sourceMessage.author.id, postData);

  const { components, flags } = generatePostComponents(postData);
  const targetChannel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
  const publishedMessage = await targetChannel.send({ components, flags });

  const timestamp = Math.floor(Date.now() / 1000);
  const typeLabel =
    postData.type === "rp"
      ? "Roleplay"
      : postData.type === "event"
      ? "Event"
      : "Activity";
  const postNumber = postData.postNumber ?? "N/A";

  await botMessage.edit({
    content: `_Log — Post Type: ${typeLabel} | Post Number: ${postNumber} | Approved by ${interaction.user} at <t:${timestamp}:f> | [View Post](${publishedMessage.url})_`,
    // ✅ Pass SOURCE post ID so mod buttons work
    components: [createModMirroredRow(sourceMessage.id)]
  });

  // ✅ DB key = SOURCE post ID (correct)
  await setMirroredPost(sourceMessage.id, publishedMessage.id, postData);

  return;
}

/* ───────── REJECT ───────── */
if (interaction.customId === REJECT_BUTTON_ID) {
  await botMessage.edit({
    content: "❌ Post rejected. Media Manager can delete it.",
    components: [createDeleteRow()]
  });
  return;
}

/* ───────── DELETE (SHOW MODAL) ───────── */
if (interaction.customId === DELETE_BUTTON_ID) {
  const modal = new ModalBuilder()
    .setCustomId(`delete_modal_${sourceMessage.id}`)
    .setTitle("Delete Post");

  const noteInput = new TextInputBuilder()
    .setCustomId("delete_note")
    .setLabel("Reason for deletion (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
  return interaction.showModal(modal);
}

  // ───────── Delete Mirrored (CONFIRM PROMPT) ─────────
  if (interaction.customId === DELETE_MIRRORED_BUTTON_ID) {
    return interaction.editReply({
      content: "⚠️ Are you sure you want to delete the mirrored post? This cannot be undone.",
      components: [createConfirmDeleteMirroredRow(sourceMessage.id)]
    });

  }

/* ───────── EDIT MIRRORED ───────── */
if (interaction.customId === EDIT_BUTTON_ID) {
  const modal = new ModalBuilder()
    .setCustomId(`edit_mirrored_${sourceMessage.id}`)
    .setTitle("Edit Mirrored Post");

  const textInput = new TextInputBuilder()
    .setCustomId("edit_text")
    .setLabel("Edit the post content")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setValue(sourceMessage.content);

  modal.addComponents(new ActionRowBuilder().addComponents(textInput));
  return interaction.showModal(modal);
}
}


  // ───────── SLASH COMMANDS (unchanged) ─────────
  if (interaction.isChatInputCommand()) {
    try {
      if (interaction.commandName === "rav-leaderboard") {
        await ravLeaderboardCommand.execute(interaction);
        return;
      }

      if (interaction.commandName === "rav-activity") {
        await ravActivityCommand.execute(interaction);
        return;
      }
    } catch (error) {
      console.error("Slash command error:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An error occurred while executing this command.",
          flags: MessageFlags.Ephemeral

        });
      }
    }
  }

  // ───────── MODAL SUBMISSION ─────────
  if (interaction.type === InteractionType.ModalSubmit) {
    // DELETE modal (existing logic)
    if (interaction.customId.startsWith("delete_modal_")) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const messageId = interaction.customId.replace("delete_modal_", "");
      const note = interaction.fields.getTextInputValue("delete_note");
      const channel = interaction.channel;

      const sourceMessage = await channel.messages.fetch(messageId).catch(() => null);
      if (!sourceMessage) return interaction.editReply("❌ Original post not found.");
      await sourceMessage.delete().catch(() => {});

      const messages = await channel.messages.fetch({ limit: 20 });
      const moderationMessage = messages.find(
        m =>
          m.author.id === interaction.client.user.id &&
          m.reference?.messageId === messageId
      );
      if (moderationMessage) await moderationMessage.edit({ content: `Post was deleted by ${interaction.user}.`, components: [] });

      try {
        const postType = detectPostType(sourceMessage.content);
        const embed = new EmbedBuilder()
          .setTitle("📝 Post Deleted")
          .setDescription(`Your ${postType} post was deleted by **${interaction.member.displayName}**.`)
          .addFields({ name: "Reason", value: note || "No reason provided" })
          .setColor(0xA2C6CA)
          .setTimestamp()
          .setFooter({ text: "Please review the post format before submitting again." });

        await sourceMessage.author.send({ embeds: [embed] });
      } catch (err) {
        console.warn(`Could not DM ${sourceMessage.author.tag}:`, err.message);
      }

      return interaction.editReply("✅ Post deleted and moderation message updated.");

    }

    // ───────── NEW: Edit Mirrored Modal Submission ─────────


// ───────── EDIT MIRRORED MODAL SUBMISSION ─────────
if (interaction.customId.startsWith("edit_mirrored_")) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });


  const sourceMessageId = interaction.customId.replace("edit_mirrored_", "");
  
  // Fetch bot/mod log message
  const botMessage = await interaction.channel.messages
    .fetch(sourceMessageId)
    .catch(() => null);
  if (!botMessage) return interaction.editReply("❌ Source message not found.");

  // Fetch mirrored mapping first
  const mapping = await getMirroredPost(sourceMessageId); // ✅ now correct
  if (!mapping) return interaction.editReply("❌ Original mirrored post not found.");

  const originalPostData = mapping.postData;
  const targetId = mapping.mirroredId;

  try {
    // Get new content from modal
    const newContent = interaction.fields.getTextInputValue("edit_text");

    // Create a fresh copy of original post data
    const updatedPostData = { ...originalPostData };

    // Parse new content line by line
    const lines = newContent.split("\n").map(l => l.trim());
    for (const line of lines) {
      if (line.startsWith("Post Number:")) updatedPostData.postNumber = line.replace("Post Number:", "").trim();
      else if (line.startsWith("Activity type:") || line.startsWith("Type:")) updatedPostData.activityType = line.split(":")[1].trim();
      else if (line.startsWith("Date:")) updatedPostData.date = line.replace("Date:", "").trim();
      else if (line.startsWith("Participants:")) updatedPostData.participants = line.replace("Participants:", "").trim();
      else if (line.startsWith("Winner:")) updatedPostData.winner = line.replace("Winner:", "").trim();
      else if (line.startsWith("Host:")) updatedPostData.host = line.replace("Host:", "").trim();
      else if (line.startsWith("Event Type:")) updatedPostData.eventType = line.replace("Event Type:", "").trim();
      else if (line.startsWith("Event Price:")) updatedPostData.eventPrice = line.replace("Event Price:", "").trim();
      else if (line.startsWith("Roleplay Story:")) updatedPostData.story = line.replace("Roleplay Story:", "").trim();
      else if (line.startsWith("Roleplay Participants:")) updatedPostData.roleplayParticipants = line.replace("Roleplay Participants:", "").trim();
    }

    // Normalize participants for RP
    if (updatedPostData.type === "rp") {
      updatedPostData.participants = updatedPostData.roleplayParticipants || "";
    }

    // Split participants into array
    if (updatedPostData.participants) {
      let normalized = updatedPostData.participants
        .replace(/\s+(and)\s+/gi, ",")
        .replace(/\s*\/\s*/g, ",")
        .replace(/\s*&\s*/g, ",")
        .replace(/\s{2,}/g, " ")
        .trim();

      updatedPostData.participantsArray = normalized
        .split(",")
        .map(p => p.trim())
        .filter(p => p);
    }

    // Rebuild mirrored message components
    const { components, flags } = generatePostComponents(updatedPostData);

    // Fetch target channel and message
    const targetChannel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
    const targetMsg = await targetChannel.messages.fetch(targetId);

    // Edit the mirrored message
    await targetMsg.edit({
      content: null,
      components,
      flags,
    });

    // Update the mod log message
    const timestamp = Math.floor(Date.now() / 1000);
    const typeLabel = updatedPostData.type === "rp"
      ? "Roleplay"
      : updatedPostData.type === "event"
      ? "Event"
      : "Activity";
    const postNumber = updatedPostData.postNumber ?? "N/A";

    await botMessage.edit({
      content: `_Log — Post Type: ${typeLabel} | Post Number: ${postNumber} | Edited by ${interaction.user} at <t:${timestamp}:f> | [View Post](${targetMsg.url})_`,
      components: [createModMirroredRow(sourceMessageId)]
    });

    // Save updated data for future edits
    await setMirroredPost(sourceMessageId, targetId, updatedPostData);
    botMessage._mirroredData = updatedPostData;

    return interaction.editReply("✏️ Mirrored post edited successfully.");
  } catch (err) {
    console.error(err);
    return interaction.editReply("❌ Failed to edit mirrored post.");
  }
}

  }
}
