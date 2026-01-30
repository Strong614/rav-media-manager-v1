import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import fs from "fs";

// Resolve path to storage file
const file = path.resolve("src/storage/mirroredPosts.json");

// Ensure storage folder exists
const folder = path.dirname(file);
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

// Ensure file exists
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ posts: {} }));

// Adapter
const adapter = new JSONFile(file);

// Initialize LowDB with default data
export const mirroredDb = new Low(adapter, { posts: {} });

/**
 * Initialize mirrored DB safely
 */
export async function initMirroredDb() {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  await mirroredDb.write();
}

/**
 * Save or update a mirrored post
 */
export async function setMirroredPost(sourceId, mirroredId, postData = null) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  mirroredDb.data.posts[sourceId] = { mirroredId, postData };
  await mirroredDb.write();
}

/**
 * Get mirrored post by source ID
 */
export async function getMirroredPost(sourceId) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  return mirroredDb.data.posts[sourceId] || null;
}

/**
 * Update only the postData for an existing mirrored post
 */
export async function updateMirroredPostData(sourceId, newPostData) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  if (mirroredDb.data.posts[sourceId]) {
    mirroredDb.data.posts[sourceId].postData = newPostData;
    await mirroredDb.write();
  }
}

/**
 * Delete a mirrored post by source ID
 */
export async function deleteMirroredPost(sourceId) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  delete mirroredDb.data.posts[sourceId];
  await mirroredDb.write();
}
