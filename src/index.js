import "dotenv/config";
import { client } from "./client.js";
import { handleMessage } from "./handlers/messageHandler.js";
import { handleInteraction } from "./handlers/interactionHandler.js";

import { ravLeaderboardCommand } from "./commands/ravLeaderboard.js";
import { ravActivityCommand } from "./commands/rav-activity.js";

import { REST, Routes, ActivityType } from "discord.js"; // <-- import ActivityType here
import { recordPostsFromMessages } from "./analytics/analyticsStore.js";
import { recordActivityFromMessages } from "./analytics/activityStats.js";

// ----------------------------
// Register slash commands
// ----------------------------
const commands = [
  ravLeaderboardCommand.data.toJSON(),
  ravActivityCommand.data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Started refreshing application (/) commands...");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.RAV_GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();

// ----------------------------
// Bot ready event
// ----------------------------
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ----------------------------
  // Set bot presence/status
  // ----------------------------
  try {
    await client.user.setPresence({
      activities: [
        {
          name: "RAV Media Archive",
          type: ActivityType.Watching // Watching
        }
      ],
      status: "online" // online, idle, dnd, invisible
    });
    console.log("✅ Bot presence set to Watching RAV submissions");
  } catch (err) {
    console.warn("❌ Could not set presence:", err);
  }

  // ----------------------------
  // Fetch all messages from source channel and record stats
  // ----------------------------
  try {
    const sourceChannel = await client.channels.fetch(process.env.SOURCE_CHANNEL_ID);

    let messages = await sourceChannel.messages.fetch({ limit: 100 });
    let lastId = messages.last()?.id;

    while (messages.size > 0 && lastId) {
      recordPostsFromMessages(messages);
      recordActivityFromMessages(messages);

      messages = await sourceChannel.messages.fetch({
        limit: 100,
        before: lastId
      });

      lastId = messages.last()?.id;
    }

    console.log("✅ Recorded all existing posts from source channel.");
  } catch (err) {
    console.error("❌ Error fetching messages from source channel:", err);
  }
});

// ----------------------------
// Event handlers
// ----------------------------
client.on("messageCreate", handleMessage);
client.on("interactionCreate", handleInteraction);

// ----------------------------
// Login
// ----------------------------
client.login(process.env.DISCORD_TOKEN);
