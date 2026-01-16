import GIFEncoder from "gifencoder";
import { createCanvas, loadImage } from "canvas";
import { generatePoliceHUDLeaderboard } from "./policeHUD.js";

export async function generateLeaderboardGIF(leaderboard, monthKey){
  const rowHeight = 50;
  const tableRows = leaderboard.filter(u =>
    ["misc","rp","raid","event"].some(t => t === "event" ? u.counts.event > 0 : u.contributors[t]?.length > 0)
  ).length;
  const dynamicHeight = 650 + tableRows * rowHeight;

  const width = 2200;
  const height = dynamicHeight;
  const steps = 25;
  const delay = 50;

  const encoder = new GIFEncoder(width, height);
  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(delay);
  encoder.setQuality(10);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  for (let s = 1; s <= steps; s++) {
    const partialLeaderboard = leaderboard.map(u => {
      const total = Math.floor(u.total * (s / steps));
      const counts = Object.fromEntries(
        Object.entries(u.counts).map(([k,v]) => [k, Math.floor(v * (s / steps))])
      );
      return { ...u, total, counts };
    });

    const frameBuffer = await generatePoliceHUDLeaderboard(partialLeaderboard, monthKey);
    const img = await loadImage(frameBuffer);
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(img,0,0);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return encoder.out.getData();
}
