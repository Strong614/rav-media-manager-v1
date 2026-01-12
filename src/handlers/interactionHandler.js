import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  InteractionType,
  ComponentType
} from "discord.js";

import {
  APPROVE_BUTTON_ID,
  REJECT_BUTTON_ID,
  DELETE_BUTTON_ID,
  createDeleteRow
} from "../ui/actionRow.js";

import { EmbedBuilder } from "discord.js";
import { generatePostComponents } from "../formatting/postComponents.js";
import { client } from "../client.js";
import { recordPost } from "../analytics/analyticsStore.js"; // THIS handles counting
import { ravLeaderboardCommand } from "../commands/ravLeaderboard.js";
import { ravActivityCommand } from "../commands/rav-activity.js";
import { enforcePostFormat } from "../utils/postFormatValidator.js"; // adjust path
import { TEMPLATE, EXAMPLES, detectPostType } from "../utils/postFormatValidator.js"; // import template & examples

const MEDIA_MANAGER_ROLE = "Media Manager";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.SOURCE_CHANNEL_ID) return;

  // Validate the post
  const isValid = await enforcePostFormat(message, true); // true = auto-deleted

  if (!isValid) {
    try {
      // Delete the original malformed post
      await message.delete();

      // Delete any bot moderation message replying to this post
      const messages = await message.channel.messages.fetch({ limit: 20 });
      const botMessage = messages.find(
        m => m.author.id === client.user.id && m.reference?.messageId === message.id
      );
      if (botMessage) await botMessage.delete();

      console.log(`[INFO] Deleted malformed post and moderation buttons from ${message.author.tag}`);
    } catch (err) {
      console.warn(`[WARN] Could not delete malformed post or buttons for ${message.author.tag}:`, err.message);
    }

    return; // stop further processing
  }

  // Valid post — stays for moderation buttons
});

/**
 * Disable all buttons in a bot-authored message
 */
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

/**
 * Extract post data from the original user message
 */
function parsePostData(message) {
  const lines = message.content.split("\n");
  const postData = {};

  let postType;

  if (lines.some(l => l.startsWith("Roleplay Story:"))) {
    postType = "rp";
  } else if (lines.some(l => l.startsWith("Event Type:"))) {
    postType = "event";
  } else {
    postType = "activity";
  }

  for (const line of lines) {
    if (line.startsWith("Post Number:"))
      postData.postNumber = line.replace("Post Number:", "").trim();

    if (line.startsWith("Date:"))
      postData.date = line.replace("Date:", "").trim();

    if (line.startsWith("Activity type:"))
      postData.activityType = line.replace("Activity type:", "").trim();

    if (line.startsWith("Participants:"))
      postData.participants = line.replace("Participants:", "").trim();

    if (line.startsWith("Event Type:"))
      postData.eventType = line.replace("Event Type:", "").trim();

    if (line.startsWith("Event Price:"))
      postData.eventPrice = line.replace("Event Price:", "").trim();

    if (line.startsWith("Host:"))
      postData.host = line.replace("Host:", "").trim();

    if (line.startsWith("Winner:"))
      postData.winner = line.replace("Winner:", "").trim();

    // ───── ROLEPLAY ─────
    if (line.startsWith("Roleplay Story:"))
      postData.story = line.replace("Roleplay Story:", "").trim();

    if (line.startsWith("Roleplay Participants:"))
      postData.participants = line.replace("Roleplay Participants:", "").trim();
  }

  postData.type = postType;
  postData.screenshotUrls = [...message.attachments.values()].map(a => a.url);
  postData.authorId = message.author.id;

  return postData;
}


export async function handleInteraction(interaction) {

  /* ───────── PERMISSION CHECK ───────── */
  if (
    interaction.isButton() &&
    !interaction.member.roles.cache.some(r => r.name === MEDIA_MANAGER_ROLE)
  ) {
    return interaction.reply({
      content: "❌ You are not allowed to perform this action (only RAV media managers).",
      flags: 64 // EPHEMERAL
    });
  }

  /* ───────── BUTTON INTERACTIONS ───────── */
  if (interaction.isButton()) {

    const botMessage = interaction.message;

    // Fetch referenced user post
    const sourceMessage = botMessage.reference
      ? await interaction.channel.messages
          .fetch(botMessage.reference.messageId)
          .catch(() => null)
      : null;

    if (!sourceMessage) {
      return interaction.reply({
        content: "❌ Original post not found.",
        flags: 64
      });
    }

    /* ───────── APPROVE ───────── */
    if (interaction.customId === APPROVE_BUTTON_ID) {
      // Acknowledge interaction immediately
      await interaction.deferUpdate();

      // Disable buttons instantly
      if (botMessage.components.length) {
        await botMessage.edit({
          components: disableButtons(botMessage)
        });
      }

      // --- RECORD POST HERE ---
      const postData = parsePostData(sourceMessage);
      recordPost(sourceMessage.author.id, postData); // <-- this updates activityStats

      // DEBUG: log current activityStats for the month
      const monthKey = new Date(sourceMessage.createdAt).getMonth() + 1;
      console.log(`[DEBUG] Approved post for author ${sourceMessage.author.id}:`, postData);

      const { components, flags } = generatePostComponents(postData);

      const targetChannel = await client.channels.fetch(
        process.env.TARGET_CHANNEL_ID
      );

      // Send post to target channel and CAPTURE the message
      const publishedMessage = await targetChannel.send({
        components,
        flags
      });

      const timestamp = Math.floor(Date.now() / 1000);

      const typeLabel =
        postData.type === "rp"
          ? "Roleplay"
          : postData.type === "event"
          ? "Event"
          : "Activity";

      const postNumber = postData.postNumber ?? "N/A";

      await botMessage.edit({
        content:
          `_Log — Post Type: ${typeLabel} | Post Number: ${postNumber} | Approved by ${interaction.user} at <t:${timestamp}:f> | [View Post](${publishedMessage.url})_`,
        components: []
      });


      return;
    }

    /* ───────── REJECT ───────── */
    if (interaction.customId === REJECT_BUTTON_ID) {
      await interaction.update({
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

      modal.addComponents(
        new ActionRowBuilder().addComponents(noteInput)
      );

      return interaction.showModal(modal);
    }
  }

  /* ───────── SLASH COMMANDS ───────── */
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
          flags: 64
        });
      }
    }
  }

 /* ───────── MODAL SUBMISSION ───────── */
if (interaction.type === InteractionType.ModalSubmit) {
  if (!interaction.customId.startsWith("delete_modal_")) return;

  await interaction.deferReply({ flags: 64 });

  const messageId = interaction.customId.replace("delete_modal_", "");
  const note = interaction.fields.getTextInputValue("delete_note");
  const channel = interaction.channel;

  const sourceMessage = await channel.messages
    .fetch(messageId)
    .catch(() => null);

  if (!sourceMessage) {
    return interaction.editReply("❌ Original post not found.");
  }

  await sourceMessage.delete().catch(() => {});

  const messages = await channel.messages.fetch({ limit: 20 });
  const moderationMessage = messages.find(
    m =>
      m.author.id === interaction.client.user.id &&
      m.reference?.messageId === messageId
  );

  if (moderationMessage) {
    await moderationMessage.edit({
      content: `Post was deleted by ${interaction.user}.`,
      components: []
    });
  }

 // ───── SEND DM WITH REASON + FORMATTING ─────
try {
  const postType = detectPostType(sourceMessage.content); // detect type from deleted message

  const embed = new EmbedBuilder()
    .setTitle("📝 Post Deleted")
    .setDescription(
      `Your ${postType} post was deleted by **${interaction.member.displayName}**.`
    )
    .addFields(
      { name: "Reason", value: note || "No reason provided" }
    )
    .setColor(0xA2C6CA)
    .setTimestamp()
    .setFooter({ text: "Please review the post format before submitting again." });

  await sourceMessage.author.send({ embeds: [embed] });
} catch (err) {
  console.warn(`Could not DM ${sourceMessage.author.tag}:`, err.message);
}

return interaction.editReply(
  "✅ Post deleted and moderation message updated."
);
}
}
