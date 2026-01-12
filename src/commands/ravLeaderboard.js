import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { getLeaderboard } from "../analytics/analyticsStore.js";
import { generateDualLeaderboardImage } from "../analytics/leaderboardCanvas.js";

export const ravLeaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName("rav-leaderboard")
    .setDescription("Show posts leaderboard")
    .addStringOption(option =>
      option
        .setName("month")
        .setDescription("Month in YYYY-MM format (optional)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Allowed channels
    const ALLOWED_CHANNELS = ["1361026129300815993", "1459687645629386836"]; // replace with your channel IDs
    if (!ALLOWED_CHANNELS.includes(interaction.channelId)) {
      return interaction.editReply({
        content: "This command can only be used in the designated channels."
      });
    }

    // Determine month key
    let monthKey = interaction.options.getString("month");
    if (!monthKey) {
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth() + 1;
      if (now.getDate() >= 27) {
        month += 1;
        if (month > 12) { month = 1; year += 1; }
      }
      monthKey = `${year}-${String(month).padStart(2, "0")}`;
    }

    // Fetch leaderboard
    const leaderboard = await getLeaderboard(monthKey, interaction.guildId);
    if (!leaderboard.length) {
      return interaction.editReply(`No posts found for ${monthKey}.`);
    }

    const buffer = await generateDualLeaderboardImage(leaderboard, monthKey);
    const attachment = new AttachmentBuilder(buffer, { name: "leaderboard.png" });

    const embed = new EmbedBuilder()
      .setTitle(`Rapid Assault Vanguard Leaderboard`)
      .setColor(0xA2C6CA)
      .setImage("attachment://leaderboard.png");

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  }
};
