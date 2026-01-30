import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

// Button IDs
export const APPROVE_BUTTON_ID = "post_approve";
export const REJECT_BUTTON_ID = "post_reject";
export const DELETE_BUTTON_ID = "post_delete";

// Mod-only mirrored buttons (prefixes)
export const EDIT_BUTTON_ID = "post_edit_mirrored";
export const DELETE_MIRRORED_BUTTON_ID = "post_delete_mirrored";

// Confirmation button prefixes
export const CONFIRM_DELETE_MIRRORED_YES = "confirm_delete_mirrored_yes";
export const CONFIRM_DELETE_MIRRORED_NO = "confirm_delete_mirrored_no";

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

// ✅ Row for mod-only mirrored post management
// MUST receive sourceMessageId
export function createModMirroredRow(sourceMessageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${EDIT_BUTTON_ID}:${sourceMessageId}`)
      .setLabel("Edit Mirrored")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`${DELETE_MIRRORED_BUTTON_ID}:${sourceMessageId}`)
      .setLabel("Delete Mirrored")
      .setStyle(ButtonStyle.Danger)
  );
}

// ✅ Confirmation row for Delete Mirrored
// MUST receive sourceMessageId
export function createConfirmDeleteMirroredRow(sourceMessageId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${CONFIRM_DELETE_MIRRORED_YES}:${sourceMessageId}`)
      .setLabel("✅ Yes, delete")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`${CONFIRM_DELETE_MIRRORED_NO}:${sourceMessageId}`)
      .setLabel("❌ Cancel")
      .setStyle(ButtonStyle.Secondary)
  );
}
