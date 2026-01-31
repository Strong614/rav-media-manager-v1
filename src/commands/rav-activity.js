import {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags
} from "discord.js";

import { activityStats } from "../analytics/activityStats.js";
import { generateActivityImage } from "../analytics/activityCanvas.js";

export const ravActivityCommand = {
  data: new SlashCommandBuilder()
    .setName("rav-activity")
    .setDescription("Show RAV activity breakdown")
    .addStringOption(option =>
      option
        .setName("month")
        .setDescription("Month in YYYY-MM format (e.g., 2026-01)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const ALLOWED_CHANNELS = ["1361026129300815993", "1459687645629386836"];

    try {
      // ❗ Acknowledge exactly once
      if (!ALLOWED_CHANNELS.includes(interaction.channelId)) {
        await interaction.reply({
          content: "This command can only be used in the designated channels.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply();

      let monthKey = interaction.options.getString("month");

      if (!monthKey) {
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth() + 1;

        if (now.getDate() >= 27) {
          month += 1;
          if (month > 12) {
            month = 1;
            year += 1;
          }
        }

        monthKey = `${year}-${String(month).padStart(2, "0")}`;
      } else {
        const [year, month] = monthKey.split("-").map(Number);
        if (!year || !month || month < 1 || month > 12) {
          await interaction.editReply("❌ Invalid month format. Use YYYY-MM.");
          return;
        }
      }

      const statsObj = activityStats[monthKey];
      if (!statsObj || !statsObj.all) {
        await interaction.editReply(`No activity data recorded yet for ${monthKey}.`);
        return;
      }

      const categories = ["misc", "event", "roleplay", "raid", "activity"];
      const stats = {};
      for (const cat of categories) stats[cat] = statsObj.all[cat] || 0;

      const buffer = await generateActivityImage(stats, monthKey);
      const attachment = new AttachmentBuilder(buffer, { name: "activity.png" });

      const embed = new EmbedBuilder()
        .setTitle(`RAV Activity Overview — ${monthKey}`)
        .setColor(0xA2C6CA)
        .setImage("attachment://activity.png");

      await interaction.editReply({
        embeds: [embed],
        files: [attachment]
      });

    } catch (err) {
      console.error("❌ /rav-activity failed:", err);

      // ❗ Never double-acknowledge
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: "❌ An error occurred while generating the activity chart."
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ An error occurred while generating the activity chart.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
