import { createCanvas } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateDualLeaderboardImage(leaderboard, monthKey) {
  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const numUsers = authorsOnly.length;

  const tableEntryCount = leaderboard.filter(u => {
    const t = (u.counts?.misc || 0) + (u.counts?.event || 0) + (u.counts?.rp || 0) + (u.counts?.raid || 0);
    return t > 0;
  }).length;

  const tableY = 200;
  const rowHeight = 32;
  const minHeightForTable = tableY + (tableEntryCount + 2) * rowHeight + 100; // +2 for header+total, 100 for footer
  const minHeightForGraph = 120 + 600 + 160; // leftY + leftHeight + name label space
  const height = Math.max(minHeightForTable, minHeightForGraph, 900);

  // Dynamic canvas width
  const width = Math.max(2000, 400 + numUsers * 80);
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
  ctx.fillText(`RAV Leaderboard | ${formatRavMonth(monthKey)}`, 50, 60);

  /* -------------------- Left Graph (Total posts only) -------------------- */
  const leftX = 50;
  const leftY = 120;
  const leftWidth = Math.floor(width * 0.48);
  const leftHeight = 600;

  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  // Horizontal grid lines
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.font = "14px 'Times New Roman'";
  ctx.fillStyle = "#ccc";
  const step = Math.ceil(maxTotal / 5) || 1;
  for (let i = 0; i <= maxTotal; i += step) {
    const y = leftY + leftHeight - (i / maxTotal) * leftHeight;
    ctx.beginPath();
    ctx.moveTo(leftX - 20, y);
    ctx.lineTo(leftX + leftWidth, y);
    ctx.stroke();
    ctx.fillText(i, leftX - 40, y + 5);
  }

  const barColor = "#00ffff"; // total posts color
  const groupWidth = leftWidth / Math.max(numUsers, 1);
  const internalGap = 5;
  const barWidth = Math.min(groupWidth - internalGap * 2, 40); // narrower bars

  authorsOnly.forEach((u, idx) => {
    const startX = leftX + idx * groupWidth + internalGap;
    const yBottom = leftY + leftHeight;
    const isMax = u.total === maxTotal;

    const barHeight = Math.max((u.total / maxTotal) * leftHeight, 1);
    const y = yBottom - barHeight;

    if (isMax) ctx.save();
    if (isMax) {
      ctx.shadowColor = "rgba(255,255,255,0.4)";
      ctx.shadowBlur = 15;
    }

    ctx.fillStyle = barColor;
    ctx.fillRect(startX, y, barWidth, barHeight);
    if (isMax) ctx.restore();

    // Total number on top
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, startX + barWidth / 2, y - 6);

    // Name below
    ctx.save();
    ctx.translate(startX + barWidth / 2, yBottom + 45);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "right";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* -------------------- Right Table -------------------- */
  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171",
    total: "#00ffff"
  };

  const tableX = Math.floor(width * 0.5);
  const tableWidth = Math.floor(width * 0.48);
  const colRatios = [0.4, 0.125, 0.125, 0.125, 0.125, 0.12];
  const colWidths = colRatios.map(r => Math.floor(tableWidth * r));
  const headers = ["User", "Misc", "Event", "RP", "Raid", "Total"];

  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 24px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText("Members participation count", tableX + tableWidth / 2, tableY - 80);

  ctx.font = "bold 18px 'Times New Roman'";
  ctx.fillStyle = "#fff";

  // Table headers
  let hx = tableX;
  headers.forEach((h, i) => {
    ctx.fillText(h, hx + colWidths[i] / 2, tableY - 10);
    hx += colWidths[i];
  });

  // Sort leaderboard
  const sorted = leaderboard
    .map(u => ({
      ...u,
      counts: u.counts || {},
      __total: (u.counts?.misc || 0) + (u.counts?.event || 0) + (u.counts?.rp || 0) + (u.counts?.raid || 0)
    }))
    .filter(u => u.__total > 0)
    .sort((a, b) => b.__total - a.__total);

  const globalTotals = { misc: 0, event: 0, rp: 0, raid: 0, total: 0 };
  sorted.forEach(u => {
    globalTotals.misc += u.counts.misc || 0;
    globalTotals.event += u.counts.event || 0;
    globalTotals.rp += u.counts.rp || 0;
    globalTotals.raid += u.counts.raid || 0;
    globalTotals.total += u.__total;
  });

  // Table rows
  ctx.font = "16px 'Times New Roman'";
  let rowIdx = 0;
  sorted.forEach((u, i) => {
    const y = tableY + rowIdx * rowHeight;

    // Column separators
    let sepX = tableX;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    colWidths.forEach(w => {
      sepX += w;
      ctx.beginPath();
      ctx.moveTo(sepX, y);
      ctx.lineTo(sepX, y + rowHeight);
      ctx.stroke();
    });

    // Username with rank merged
    let cx = tableX;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(`#${i + 1} ${u.displayName || ""}`, cx + colWidths[0] / 2, y + 24);
    cx += colWidths[0];

    // Counts centered
    ["misc", "event", "rp", "raid"].forEach((t, idx) => {
      ctx.fillStyle = typeColors[t];
      ctx.fillText(u.counts[t] || 0, cx + colWidths[idx + 1] / 2, y + 24);
      cx += colWidths[idx + 1];
    });

    // Total column
    ctx.fillStyle = typeColors.total;
    ctx.fillText(u.__total, cx + colWidths[5] / 2, y + 24);

    rowIdx++;
  });

  // Total row
  const yTotal = tableY + rowIdx * rowHeight;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(tableX, yTotal, tableWidth, rowHeight);

  let cx = tableX;
  ctx.font = "bold 16px 'Times New Roman'";
  ctx.fillStyle = "#fff";

  ctx.textAlign = "center";
  ctx.fillText("TOTAL", cx + colWidths[0] / 2, yTotal + 24);
  cx += colWidths[0];

  ["misc", "event", "rp", "raid"].forEach((t, idx) => {
    ctx.fillStyle = typeColors[t];
    ctx.fillText(globalTotals[t], cx + colWidths[idx + 1] / 2, yTotal + 24);
    cx += colWidths[idx + 1];
  });
  ctx.fillStyle = typeColors.total;
  ctx.fillText(globalTotals.total, cx + colWidths[5] / 2, yTotal + 24);

  /* -------------------- Footer -------------------- */
  const footerY = Math.max(yTotal + rowHeight + 40, height - 40);
  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, footerY);
  const currentDate = new Date().toLocaleDateString();
  ctx.fillText(`Generated on ${currentDate}`, width / 2, footerY + 20);

  return canvas.toBuffer();
}
