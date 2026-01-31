import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import fs from "fs";

// Resolve path to storage file
const file = path.resolve("src/storage/mirroredPosts.json");

// Ensure storage folder exists
const folder = path.dirname(file);
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

// Ensure file exists and is valid JSON
function ensureValidJSON() {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ posts: {} }, null, 2));
    console.log("[DB INIT] Created new mirroredPosts.json");
  } else {
    try {
      const content = fs.readFileSync(file, "utf-8").trim();
      JSON.parse(content); // test if valid
    } catch {
      fs.writeFileSync(file, JSON.stringify({ posts: {} }, null, 2));
      console.log("[DB INIT] Recreated mirroredPosts.json (was corrupted)");
    }
  }
}
ensureValidJSON();

// Adapter
const adapter = new JSONFile(file);

// Initialize LowDB with default data
export const mirroredDb = new Low(adapter, { posts: {} });

/**
 * Print current DB state for debugging
 */
function logDbState(action) {
  console.log(`[DB ${action}] Current mirroredPosts.json:`);
  console.log(JSON.stringify(mirroredDb.data, null, 2));
}

/**
 * Initialize mirrored DB safely
 */
export async function initMirroredDb() {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  await mirroredDb.write();
  console.log("[DB INIT] mirroredDb initialized");
  logDbState("INIT");
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
  console.log(`[DB SET] sourceId=${sourceId} -> mirroredId=${mirroredId}`);
  logDbState("SET");
}

/**
 * Get mirrored post by source ID
 */
export async function getMirroredPost(sourceId) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  const result = mirroredDb.data.posts[sourceId] || null;
  console.log(`[DB GET] sourceId=${sourceId} -> ${result ? "found" : "not found"}`);
  return result;
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
    console.log(`[DB UPDATE] sourceId=${sourceId} postData updated`);
    logDbState("UPDATE");
  } else {
    console.log(`[DB UPDATE] sourceId=${sourceId} not found`);
  }
}

/**
 * Delete a mirrored post by source ID
 */
export async function deleteMirroredPost(sourceId) {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  mirroredDb.data.posts ||= {};
  if (mirroredDb.data.posts[sourceId]) {
    delete mirroredDb.data.posts[sourceId];
    await mirroredDb.write();
    console.log(`[DB DELETE] sourceId=${sourceId} deleted`);
    logDbState("DELETE");
  } else {
    console.log(`[DB DELETE] sourceId=${sourceId} not found`);
  }
}
