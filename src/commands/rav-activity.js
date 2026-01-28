import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { activityStats, getCurrentRavMonthKey } from "../analytics/activityStats.js";
import { generateActivityImage } from "../analytics/activityCanvas.js";

export const ravActivityCommand = {
  data: new SlashCommandBuilder()
    .setName("rav-activity")
    .setDescription("Show RAV activity breakdown")
    .addStringOption(option =>
      option.setName("month")
            .setDescription("Month in YYYY-MM format")
            .setRequired(false)
    ),

  async execute(interaction) {
    const ALLOWED_CHANNELS = ["1361026129300815993", "1459687645629386836"];
    if (!ALLOWED_CHANNELS.includes(interaction.channelId))
      return interaction.reply({ content: "This command can only be used in the designated channels.", ephemeral: true });

    // Get monthKey from option or compute current Rav month
    let monthKey = interaction.options.getString("month");
    if (!monthKey) monthKey = getCurrentRavMonthKey();

    const stats = activityStats[monthKey];  // <-- FIX: use monthKey
    if (!stats) return interaction.reply({ content: "No activity data recorded yet for this month.", ephemeral: true });

    // Generate canvas from latest stats
    const buffer = await generateActivityImage(stats, monthKey);
    const attachment = new AttachmentBuilder(buffer, { name: "activity.png" });

    const embed = new EmbedBuilder()
      .setTitle(`RAV Activity Overview — ${monthKey}`)
      .setColor(0xA2C6CA)
      .setImage("attachment://activity.png");

    // Reply to the interaction
    await interaction.reply({ embeds: [embed], files: [attachment] });
  }
};
