import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import { existsSync, writeFileSync, mkdirSync } from "fs";

// Ensure the storage folder exists
const storageDir = path.resolve("storage");
if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });

// Ensure the file exists
const filePath = path.join(storageDir, "mirroredPosts.json");
if (!existsSync(filePath)) writeFileSync(filePath, "{}");

const adapter = new JSONFile(filePath);
export const mirroredDb = new Low(adapter, { posts: {} });

export async function initMirroredDb() {
  await mirroredDb.read();
  mirroredDb.data ||= { posts: {} };
  await mirroredDb.write();
}

export async function setMirroredPost(sourceId, mirroredId, postData = null) {
  await mirroredDb.read();
  mirroredDb.data.posts[sourceId] = { mirroredId, postData };
  await mirroredDb.write();
}

export async function getMirroredPost(sourceId) {
  await mirroredDb.read();
  return mirroredDb.data.posts[sourceId] || null;
}

export async function updateMirroredPostData(sourceId, newPostData) {
  await mirroredDb.read();
  if (mirroredDb.data.posts[sourceId]) {
    mirroredDb.data.posts[sourceId].postData = newPostData;
    await mirroredDb.write();
  }
}

export async function deleteMirroredPost(sourceId) {
  await mirroredDb.read();
  delete mirroredDb.data.posts[sourceId];
  await mirroredDb.write();
}
