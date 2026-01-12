import {
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from "discord.js";
import { BANNERS } from "../config/banners.js";

function createGallery(urls) {
  if (!Array.isArray(urls)) return null;

  const items = urls
    .filter((u) => typeof u === "string" && u.startsWith("http"))
    .slice(0, 10)
    .map(
      (url) =>
        new MediaGalleryItemBuilder().setURL(url)
    );

  if (items.length === 0) return null;

  return new MediaGalleryBuilder().addItems(items);
}

export function generatePostComponents(postData) {
  const components = [];

  // ───── Banner ─────
  const bannerUrl = BANNERS[postData.type];
  const banner = createGallery(bannerUrl ? [bannerUrl] : null);
  if (banner) components.push(banner);

  components.push(new SeparatorBuilder().setDivider(true));

  // ───── Text (always exists) ─────
  const textLines = [];

  switch (postData.type) {
    case "activity":
      textLines.push(`**Activity ${postData.postNumber ?? "N/A"}**`);
      textLines.push(`Type: ${postData.activityType ?? "N/A"}`);
      textLines.push(`Date: ${postData.date ?? "N/A"}`);
      textLines.push(`Participants: ${postData.participants ?? "N/A"}`);
      break;

    case "event":
      textLines.push(`**Event ${postData.postNumber ?? "N/A"}**`);
      textLines.push(`Type: ${postData.eventType ?? "N/A"}`);
      textLines.push(`Price: ${postData.eventPrice ?? "N/A"}`);
      textLines.push(`Host: ${postData.host ?? "N/A"}`);
      textLines.push(`Winner: ${postData.winner ?? "N/A"}`);
      textLines.push(`Date: ${postData.date ?? "N/A"}`);
      break;

    case "rp":
      textLines.push(`**Roleplay Story:** ${postData.story ?? "N/A"}`);
      textLines.push(`**Roleplay Participants:** ${postData.participants ?? "N/A"}`);
      textLines.push(`**Post Number:** ${postData.postNumber ?? "N/A"}`);
      textLines.push(`**Date:** ${postData.date ?? "N/A"}`);
      break;


    default:
      textLines.push("Invalid post format");
  }

  for (const line of textLines) {
    components.push(new TextDisplayBuilder().setContent(line));
  }

  components.push(new SeparatorBuilder().setDivider(true));

  // ───── Screenshots ─────
  const screenshots = createGallery(postData.screenshotUrls);
  if (screenshots) components.push(screenshots);

  // ───── Footer ─────
  components.push(new SeparatorBuilder().setDivider(true));

  const footer = createGallery([BANNERS.bar]);
  if (footer) components.push(footer);

  return {
    components,
    flags: MessageFlags.IsComponentsV2,
  };
}
