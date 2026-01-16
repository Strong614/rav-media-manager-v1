import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { activityStats } from "../analytics/activityStats.js";
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

    let monthKey = interaction.options.getString("month");
    if (!monthKey) {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth() + 1;
      if (now.getDate() >= 27) month += 1;
      monthKey = `${year}-${String(month).padStart(2, "0")}`;
    }

    const stats = activityStats.all;
    if (!stats) return interaction.reply("No activity data recorded yet.");

    // Generate canvas from latest stats
    const buffer = await generateActivityImage(stats, monthKey);
    const attachment = new AttachmentBuilder(buffer, { name: "activity.png" });

    const embed = new EmbedBuilder()
      .setTitle("RAV Activity Overview")
      .setColor(0xA2C6CA)
      .setImage("attachment://activity.png");

    await interaction.reply({ embeds: [embed], files: [attachment] });
  }
};
