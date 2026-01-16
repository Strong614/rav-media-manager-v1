import { createCanvas } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateDualLeaderboardImage(leaderboard, monthKey) {
  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const numUsers = authorsOnly.length;

  // Dynamic canvas width if too many users
  const width = Math.max(2000, 400 + numUsers * 100);
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
  ctx.fillText(`RAV Leaderboard | ${formatRavMonth(monthKey)}`, 50, 60);

  /* -------------------- Left Graph (Posting leaderboard) -------------------- */
  const leftX = 50;
  const leftY = 120;
  const leftWidth = Math.floor(width * 0.48);
  const leftHeight = 400;

  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  // Horizontal grid lines
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.font = "14px 'Times New Roman'";
  ctx.fillStyle = "#ccc";
  const step = Math.ceil(maxTotal / 5);
  for (let i = 0; i <= maxTotal; i += step) {
    const y = leftY + leftHeight - (i / maxTotal) * leftHeight;
    ctx.beginPath();
    ctx.moveTo(leftX - 40, y);
    ctx.lineTo(leftX + leftWidth, y);
    ctx.stroke();
    ctx.fillText(i, leftX - 50, y + 5);
  }

  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171",
    total: "#00ffff"
  };

  // Bar width per user
  const groupWidth = leftWidth / Math.max(numUsers, 1);
  const internalGap = 5;
  const barWidth = (groupWidth - internalGap * 3) / 4; // 4 bars per user

  authorsOnly.forEach((u, idx) => {
    const startX = leftX + idx * groupWidth + internalGap / 2;
    const yBottom = leftY + leftHeight;

    if (u.total === maxTotal) {
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.4)";
      ctx.shadowBlur = 15;
    }

    let barX = startX;
    ["misc", "event", "rp", "raid"].forEach(type => {
      const count = u.counts[type] || 0;
      const barHeight = (count / maxTotal) * leftHeight;
      const y = yBottom - barHeight;
      ctx.fillStyle = typeColors[type];
      ctx.fillRect(barX, y, barWidth, barHeight);
      barX += barWidth + internalGap;
    });

    if (u.total === maxTotal) ctx.restore();

    // Total number on top
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, startX + (barWidth * 4 + internalGap * 3) / 2, yBottom - (u.total / maxTotal) * leftHeight - 10);

    // Name below group
    ctx.save();
    ctx.translate(startX + (barWidth * 4 + internalGap * 3) / 2, yBottom + 40);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "right";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* -------------------- KPI Legend -------------------- */
  const legendX = leftX;
  const legendY = leftY + leftHeight + 120;
  const kpi = [
    { label: "Misc", color: typeColors.misc },
    { label: "Event", color: typeColors.event },
    { label: "RP", color: typeColors.rp },
    { label: "Raid", color: typeColors.raid },
    { label: "Total Posts", color: typeColors.total }
  ];
  ctx.font = "16px 'Times New Roman'";
  ctx.textAlign = "left";
  let legendOffsetX = 0;
  kpi.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX + legendOffsetX, legendY, 20, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText(item.label, legendX + legendOffsetX + 25, legendY + 16);
    legendOffsetX += 130;
  });

  /* -------------------- Right Table -------------------- */
  const tableX = Math.floor(width * 0.5);
  const tableY = 200;
  const tableWidth = Math.floor(width * 0.48);
  const rowHeight = 40;
  const colRatios = [0.4, 0.125, 0.125, 0.125, 0.125, 0.12]; // removed rank column
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

    // Row background transparent
    ctx.fillStyle = "transparent";
    ctx.fillRect(tableX, y, tableWidth, rowHeight);

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
    ctx.fillText(`#${i + 1} ${u.displayName || ""}`, cx + colWidths[0] / 2, y + 28);
    cx += colWidths[0];

    // Counts centered
    ["misc", "event", "rp", "raid"].forEach((t, idx) => {
      ctx.fillStyle = typeColors[t];
      ctx.fillText(u.counts[t] || 0, cx + colWidths[idx + 1] / 2, y + 28);
      cx += colWidths[idx + 1];
    });

    // Total column
    ctx.fillStyle = typeColors.total;
    ctx.fillText(u.__total, cx + colWidths[5] / 2, y + 28);

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
  ctx.fillText("TOTAL", cx + colWidths[0] / 2, yTotal + 28);
  cx += colWidths[0];

  ["misc", "event", "rp", "raid"].forEach((t, idx) => {
    ctx.fillStyle = typeColors[t];
    ctx.fillText(globalTotals[t], cx + colWidths[idx + 1] / 2, yTotal + 28);
    cx += colWidths[idx + 1];
  });
  ctx.fillStyle = typeColors.total;
  ctx.fillText(globalTotals.total, cx + colWidths[5] / 2, yTotal + 28);

  /* -------------------- Footer -------------------- */
  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);
  const currentDate = new Date().toLocaleDateString();
  ctx.fillText(`Generated on ${currentDate}`, width / 2, height - 10);

  return canvas.toBuffer();
}
