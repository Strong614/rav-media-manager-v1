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
  ctx.fillText(`RAV Leaderboard | ${formatRavMonth(monthKey)}`, 50, 60);

  /* -------------------- Left graph (posting leaderboard + KPI) -------------------- */
  const leftX = 50;
  const leftY = 120;
  const leftWidth = Math.floor(width * 0.35);
  const leftHeight = 400;

  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  // Draw horizontal grid lines
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

  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171",
    total: "#00ffff"
  };

  // Draw bars with stacked segments inside
  authorsOnly.forEach((u, idx) => {
    const x = leftX + idx * (barWidth + gap);
    let yBottom = leftY + leftHeight;

    // Glow for top contributor
    if (u.total === maxTotal) {
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.4)";
      ctx.shadowBlur = 20;
    }

    // Draw stacked segments inside total bar
    ["misc", "event", "rp", "raid"].forEach(type => {
      const count = u.counts[type] || 0;
      const barHeight = (count / maxTotal) * leftHeight;
      const y = yBottom - barHeight;

      ctx.fillStyle = typeColors[type];
      ctx.fillRect(x, y, barWidth, barHeight);
      yBottom -= barHeight;
    });

    if (u.total === maxTotal) ctx.restore();

    // Total number on top of bar
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, x + barWidth / 2, leftY + leftHeight - (u.total / maxTotal) * leftHeight - 10);

    // Name below bar
    ctx.save();
    ctx.translate(x + barWidth / 2, leftY + leftHeight + 40);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "#ddd";
    ctx.textAlign = "right";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* -------------------- KPI Legend below graph -------------------- */
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
    // Draw color box
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX + legendOffsetX, legendY, 20, 20);

    // Draw label
    ctx.fillStyle = "#fff";
    ctx.fillText(item.label, legendX + legendOffsetX + 25, legendY + 16);

    legendOffsetX += 130;
  });

  /* -------------------- Table (right side) -------------------- */
  const tableX = Math.floor(width * 0.45);
  const tableY = 200;
  const tableWidth = Math.floor(width * 0.52);
  const rowHeight = 40;

  const colRatios = [0.08, 0.30, 0.125, 0.125, 0.125, 0.125, 0.12];
  const colWidths = colRatios.map(r => Math.floor(tableWidth * r));

  const headers = ["#", "User", "Misc", "Event", "RP", "Raid", "Total"];

  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 24px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText("Members participation count", tableX + tableWidth / 2, tableY - 80);

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
      counts: u.counts || {},
      __total:
        (u.counts?.misc || 0) +
        (u.counts?.event || 0) +
        (u.counts?.rp || 0) +
        (u.counts?.raid || 0)
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

  /* -------- Table rows -------- */
  ctx.font = "16px 'Times New Roman'";
  let rowIdx = 0;

  sorted.forEach((u, i) => {
    const y = tableY + rowIdx * rowHeight;

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

    // Rank + badges
    let cx = tableX;
    ctx.textAlign = "center";
    ctx.fillStyle = "#cbd5f5";
    ctx.fillText(`#${i + 1}`, cx + colWidths[0] / 2, y + 28);
    if (i === 0) ctx.fillText("★★★", cx + colWidths[0] - 10, y + 28);
    else if (i === 1) ctx.fillText("★★", cx + colWidths[0] - 10, y + 28);
    else if (i === 2) ctx.fillText("★", cx + colWidths[0] - 10, y + 28);
    cx += colWidths[0];

    // Username
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(u.displayName || "", cx + 5, y + 28);
    cx += colWidths[1];

    // Counts right-aligned
    ctx.textAlign = "right";
    ["misc", "event", "rp", "raid"].forEach((t, idx) => {
      ctx.fillStyle = typeColors[t];
      ctx.fillText(u.counts[t] || 0, cx + colWidths[idx + 2] - 5, y + 28);
      cx += colWidths[idx + 2];
    });

    // TOTAL column
    ctx.fillStyle = typeColors.total;
    ctx.fillText(u.__total, cx + colWidths[6] - 5, y + 28);

    rowIdx++;
  });

  /* -------- TOTAL row -------- */
  const y = tableY + rowIdx * rowHeight;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(tableX, y, tableWidth, rowHeight);

  let cx = tableX;
  ctx.font = "bold 16px 'Times New Roman'";
  ctx.fillStyle = "#fff";

  ctx.textAlign = "center";
  ctx.fillText("—", cx + colWidths[0] / 2, y + 28);
  cx += colWidths[0];

  ctx.textAlign = "left";
  ctx.fillText("TOTAL", cx + 5, y + 28);
  cx += colWidths[1];

  ctx.textAlign = "right";
  ["misc", "event", "rp", "raid"].forEach((t, idx) => {
    ctx.fillStyle = typeColors[t];
    ctx.fillText(globalTotals[t], cx + colWidths[idx + 2] - 5, y + 28);
    cx += colWidths[idx + 2];
  });

  ctx.fillStyle = typeColors.total;
  ctx.fillText(globalTotals.total, cx + colWidths[6] - 5, y + 28);

  /* -------------------- Footer -------------------- */
  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);
  const currentDate = new Date().toLocaleDateString();
  ctx.fillText(`Generated on ${currentDate}`, width / 2, height - 10);

  return canvas.toBuffer();
}
