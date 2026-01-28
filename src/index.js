import "dotenv/config";
import express from "express";
import { client } from "./client.js";
import { handleMessage } from "./handlers/messageHandler.js";
import { handleInteraction } from "./handlers/interactionHandler.js";

import { ravLeaderboardCommand } from "./commands/ravLeaderboard.js";
import { ravActivityCommand } from "./commands/rav-activity.js";

import { REST, Routes, ActivityType } from "discord.js";
import { recordPostsFromMessages } from "./analytics/analyticsStore.js";
import {
  recordActivityFromMessages,
  recordActivityPost,
  getCurrentRavMonthKey
} from "./analytics/activityStats.js";

import { recordPost } from "./analytics/analyticsStore.js";
import { parsePostData } from "./utils/postParser.js";


// ----------------------------
// Global error logging
// ----------------------------
process.on("unhandledRejection", (err) => console.error("❌ UNHANDLED REJECTION:", err));
process.on("uncaughtException", (err) => console.error("❌ UNCAUGHT EXCEPTION:", err));

// ----------------------------
// Debug: Environment variables
// ----------------------------
console.log("DEBUG ENV CHECK:", {
  hasToken: !!process.env.DISCORD_TOKEN,
  hasClientId: !!process.env.CLIENT_ID,
  hasGuildId: !!process.env.RAV_GUILD_ID,
  hasSourceChannel: !!process.env.SOURCE_CHANNEL_ID
});

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
    console.log("🔄 Refreshing slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.RAV_GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
})();

// ----------------------------
// Bot ready event
// ----------------------------
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await client.user.setPresence({
      activities: [{ name: "RAV Media Archive", type: ActivityType.Watching }],
      status: "online"
    });
    console.log("✅ Presence set.");
  } catch (err) {
    console.warn("❌ Could not set presence:", err);
  }

// ----------------------------
// Fetch historical posts
// ----------------------------
try {
  const sourceChannel = await client.channels.fetch(process.env.SOURCE_CHANNEL_ID);
  let messages = await sourceChannel.messages.fetch({ limit: 100 });
  let lastId = messages.last()?.id;

  while (messages.size > 0 && lastId) {
    // Record each message into the correct Rav month
    messages.forEach(msg => {
      try {
        const postData = parsePostData(msg);
        recordPostsFromMessages([msg]); // Leaderboard stats
        recordActivityPost(postData, getCurrentRavMonthKey(msg.createdAt)); // Correct month per message
      } catch (err) {
        console.warn(`[DEBUG] Failed to record historical message ${msg.id}:`, err);
      }
    });

    messages = await sourceChannel.messages.fetch({ limit: 100, before: lastId });
    lastId = messages.last()?.id;
  }

  console.log("✅ Recorded all existing posts from source channel.");
} catch (err) {
  console.error("❌ Error fetching historical messages:", err);
}

});

// ----------------------------
// Real-time recording
// ----------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== process.env.SOURCE_CHANNEL_ID) return;

  try {
    const postData = parsePostData(message);
    recordPost(postData);           // Leaderboard stats
    const monthKey = getCurrentRavMonthKey(message.createdAt);
    recordActivityPost(postData, monthKey);   // Activity stats
  } catch (err) {
    console.warn(`[DEBUG] Failed to record message ${message.id}:`, err);
  }

  handleMessage(message); // existing handler
});

client.on("interactionCreate", handleInteraction);

// ----------------------------
// Login with debug
// ----------------------------
console.log("DEBUG: Starting Discord login...");
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("DEBUG: login() promise resolved"))
  .catch(err => console.error("❌ LOGIN ERROR:", err));

// ----------------------------
// Web server for uptime
// ----------------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

