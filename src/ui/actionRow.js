import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

// Button IDs
export const APPROVE_BUTTON_ID = "post_approve";
export const REJECT_BUTTON_ID = "post_reject";
export const DELETE_BUTTON_ID = "post_delete";

// Initial row: approve + reject
export function createActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(APPROVE_BUTTON_ID)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(REJECT_BUTTON_ID)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );
}

// Row for delete after rejection
export function createDeleteRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(DELETE_BUTTON_ID)
      .setLabel("Delete Post")
      .setStyle(ButtonStyle.Danger)
  );
}
