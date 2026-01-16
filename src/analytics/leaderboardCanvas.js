import { createCanvas } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateDualLeaderboardImage(leaderboard, monthKey) {
  const width = 2000;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* -------------------- Background -------------------- */
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#1e1f24");
  bg.addColorStop(1, "#14151a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  /* -------------------- Title -------------------- */
  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 44px 'Times New Roman'";
  ctx.textAlign = "left";
  const dateRangeStr = formatRavMonth(monthKey);
  ctx.fillText(`RAV Leaderboard | ${dateRangeStr}`, 50, 60);

  /* -------------------- Left graph -------------------- */
  const leftX = 50;
  const leftY = 120;
  const leftWidth = Math.floor(width * 0.35);
  const leftHeight = 400;

  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.font = "14px 'Times New Roman'";
  ctx.fillStyle = "#ccc";

  const step = Math.ceil(maxTotal / 5);
  for (let i = 0; i <= maxTotal; i += step) {
    const y = leftY + leftHeight - (i / maxTotal) * leftHeight;
    ctx.beginPath();
    ctx.moveTo(leftX - 30, y);
    ctx.lineTo(leftX + leftWidth, y);
    ctx.stroke();
    ctx.fillText(i, leftX - 40, y + 5);
  }

  const barWidth = Math.min(50, leftWidth / (authorsOnly.length * 1.6));
  const gap = barWidth * 0.6;

  authorsOnly.forEach((u, idx) => {
    const barHeight = (u.total / maxTotal) * leftHeight;
    const x = leftX + idx * (barWidth + gap);
    const y = leftY + leftHeight - barHeight;

    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, "#00ffff");
    gradient.addColorStop(1, "#0066ff");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, x + barWidth / 2, y - 10);

    ctx.save();
    ctx.translate(x + barWidth / 2, leftY + leftHeight + 40);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "right";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* -------------------- Table -------------------- */

  const tableX = Math.floor(width * 0.45);
  const tableY = 200;
  const tableWidth = Math.floor(width * 0.52);
  const rowHeight = 40;

  // # | User | Total | Misc | Event | RP | Raid
  const colRatios = [0.08, 0.30, 0.12, 0.125, 0.125, 0.125, 0.125];
  const colWidths = colRatios.map(r => Math.floor(tableWidth * r));

  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 24px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText("Members participation count", tableX + tableWidth / 2, tableY - 80);

  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171",
    total: "#e5e7eb"
  };

  const headers = ["#", "User", "Total", "Misc", "Event", "RP", "Raid"];
  ctx.font = "bold 18px 'Times New Roman'";
  ctx.fillStyle = "#fff";

  let hx = tableX;
  headers.forEach((h, i) => {
    ctx.fillText(h, hx + colWidths[i] / 2, tableY - 10);
    hx += colWidths[i];
  });

  /* -------- sort + totals -------- */

  const sorted = leaderboard
    .map(u => ({
      ...u,
      __total:
        (u.counts.misc || 0) +
        (u.counts.event || 0) +
        (u.counts.rp || 0) +
        (u.counts.raid || 0)
    }))
    .filter(u => u.__total > 0)
    .sort((a, b) => b.__total - a.__total);

  const globalTotals = {
    misc: 0,
    event: 0,
    rp: 0,
    raid: 0,
    total: 0
  };

  sorted.forEach(u => {
    globalTotals.misc += u.counts.misc || 0;
    globalTotals.event += u.counts.event || 0;
    globalTotals.rp += u.counts.rp || 0;
    globalTotals.raid += u.counts.raid || 0;
    globalTotals.total += u.__total;
  });

  /* -------- rows -------- */

  ctx.font = "16px 'Times New Roman'";
  let rowIdx = 0;

  sorted.forEach((u, i) => {
    const y = tableY + rowIdx * rowHeight;

    ctx.fillStyle = rowIdx % 2 === 0 ? "rgba(255,255,255,0.07)" : "transparent";
    ctx.fillRect(tableX, y, tableWidth, rowHeight);

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;

    let x = tableX;
    colWidths.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
      x += w;
    });
    ctx.strokeRect(tableX, y, tableWidth, rowHeight);

    let cx = tableX;
    ctx.textAlign = "center";

    ctx.fillStyle = "#cbd5f5";
    ctx.fillText(`#${i + 1}`, cx + colWidths[0] / 2, y + 28);
    cx += colWidths[0];

    ctx.fillStyle = "#fff";
    ctx.fillText(u.displayName, cx + colWidths[1] / 2, y + 28);
    cx += colWidths[1];

    ctx.fillStyle = typeColors.total;
    ctx.font = "bold 16px 'Times New Roman'";
    ctx.fillText(u.__total, cx + colWidths[2] / 2, y + 28);
    ctx.font = "16px 'Times New Roman'";
    cx += colWidths[2];

    ["misc", "event", "rp", "raid"].forEach((t, idx) => {
      ctx.fillStyle = typeColors[t];
      ctx.fillText(
        u.counts[t] || 0,
        cx + colWidths[idx + 3] / 2,
        y + 28
      );
      cx += colWidths[idx + 3];
    });

    rowIdx++;
  });

  /* -------- TOTAL ROW -------- */

  const y = tableY + rowIdx * rowHeight;

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(tableX, y, tableWidth, rowHeight);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, y, tableWidth, rowHeight);

  let cx = tableX;
  ctx.textAlign = "center";
  ctx.font = "bold 16px 'Times New Roman'";

  ctx.fillStyle = "#fff";
  ctx.fillText("—", cx + colWidths[0] / 2, y + 28);
  cx += colWidths[0];

  ctx.fillText("TOTAL", cx + colWidths[1] / 2, y + 28);
  cx += colWidths[1];

  ctx.fillStyle = typeColors.total;
  ctx.fillText(globalTotals.total, cx + colWidths[2] / 2, y + 28);
  cx += colWidths[2];

  ["misc", "event", "rp", "raid"].forEach((t, idx) => {
    ctx.fillStyle = typeColors[t];
    ctx.fillText(
      globalTotals[t],
      cx + colWidths[idx + 3] / 2,
      y + 28
    );
    cx += colWidths[idx + 3];
  });

  /* -------------------- Footer -------------------- */
  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);

  return canvas.toBuffer();
}
