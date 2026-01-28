import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { activityStats, getRavMonthRange } from "../analytics/activityStats.js";
import { generateActivityImage } from "../analytics/activityCanvas.js";

export const ravActivityCommand = {
  data: new SlashCommandBuilder()
    .setName("rav-activity")
    .setDescription("Show RAV activity breakdown")
    .addStringOption(option =>
      option.setName("month")
            .setDescription("Month in YYYY-MM format (e.g., 2026-01)")
            .setRequired(false)
    ),

  async execute(interaction) {
    const ALLOWED_CHANNELS = ["1361026129300815993", "1459687645629386836"];
    if (!ALLOWED_CHANNELS.includes(interaction.channelId)) {
      return interaction.reply({ content: "This command can only be used in the designated channels.", ephemeral: true });
    }

    await interaction.deferReply();

    try {
      let monthKey = interaction.options.getString("month");

      // If user supplied a month, adjust to Rav month key by checking date range
      if (monthKey) {
        // Find the Rav month key that covers this calendar month
        const [year, month] = monthKey.split("-").map(Number);
        if (!year || !month) {
          return interaction.editReply("❌ Invalid month format. Use YYYY-MM.");
        }

        // Search activityStats for a month that overlaps this calendar month
        monthKey = Object.keys(activityStats).find(key => {
          const { start, end } = getRavMonthRange(key);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59);
          // Overlap check
          return start <= monthEnd && end >= monthStart;
        }) || monthKey; // fallback to requested key
      }

      const statsObj = activityStats[monthKey];
      if (!statsObj || !statsObj.all) {
        return interaction.editReply({ content: `No activity data recorded yet for ${monthKey}.` });
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

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (err) {
      console.error("❌ Error executing /rav-activity:", err);
      await interaction.editReply({ content: "An error occurred while generating the activity chart." });
    }
  }
};
