import { createActionRow } from "../ui/actionRow.js";

export async function handleMessage(message) {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.SOURCE_CHANNEL_ID) return;

  const roleId = process.env.MEDIA_MANAGER_ROLE_ID; // Put your role ID here or in .env

  await message.reply({
    content: `RAV <@&${roleId}> will either ✅ Approve or ❌ Reject this post.`,
    components: [createActionRow()],
  });
}
