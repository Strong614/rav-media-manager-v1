import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { activityStats, getCurrentRavMonthKey } from "../analytics/activityStats.js";
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
      let monthKey = interaction.options.getString("month") || getCurrentRavMonthKey();
      const statsObj = activityStats[monthKey];

      if (!statsObj || !statsObj.all || Object.keys(statsObj.all).length === 0) {
        return interaction.editReply({ content: `No activity data recorded yet for ${monthKey}.` });
      }

      const stats = statsObj.all;
      const categories = ["misc", "event", "roleplay", "raid", "activity"];
      for (const cat of categories) if (!(cat in stats)) stats[cat] = 0;

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
