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

  /* -------------------- Left graph: Posts per author -------------------- */
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

  /* -------------------- Right table (responsive + sorted) -------------------- */

  const tableX = Math.floor(width * 0.45);
  const tableY = 200;
  const tableWidth = Math.floor(width * 0.5);
  const rowHeight = 40;

  const colRatios = [0.4, 0.15, 0.15, 0.15, 0.15];
  const colWidths = colRatios.map(r => Math.floor(tableWidth * r));

  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 24px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText(
    "Members participation count",
    tableX + tableWidth / 2,
    tableY - 80
  );

  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171"
  };

  ctx.font = "bold 18px 'Times New Roman'";
  ctx.fillStyle = "#fff";

  const headers = ["User", "Misc", "Event", "RP", "Raid"];
  let headerX = tableX;
  headers.forEach((header, i) => {
    ctx.fillText(header, headerX + colWidths[i] / 2, tableY - 10);
    headerX += colWidths[i];
  });

  /* ---- sort by total descending (table only) ---- */
  const sortedForTable = [...leaderboard].sort((a, b) => {
    const totalA =
      (a.counts.misc || 0) +
      (a.counts.event || 0) +
      (a.counts.rp || 0) +
      (a.counts.raid || 0);

    const totalB =
      (b.counts.misc || 0) +
      (b.counts.event || 0) +
      (b.counts.rp || 0) +
      (b.counts.raid || 0);

    return totalB - totalA;
  });

  ctx.font = "16px 'Times New Roman'";
  let displayedIdx = 0;

  sortedForTable.forEach(u => {
    const hasActivity = ["misc", "event", "rp", "raid"].some(
      type => (u.counts[type] || 0) > 0
    );
    if (!hasActivity) return;

    const y = tableY + displayedIdx * rowHeight;

    ctx.fillStyle =
      displayedIdx % 2 === 0 ? "rgba(255,255,255,0.07)" : "transparent";
    ctx.fillRect(tableX, y, tableWidth, rowHeight);

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;

    let lineX = tableX;
    colWidths.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + rowHeight);
      ctx.stroke();
      lineX += w;
    });

    ctx.beginPath();
    ctx.moveTo(tableX + tableWidth, y);
    ctx.lineTo(tableX + tableWidth, y + rowHeight);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(u.displayName, tableX + colWidths[0] / 2, y + 28);

    let cellX = tableX + colWidths[0];
    ["misc", "event", "rp", "raid"].forEach((type, i) => {
      ctx.fillStyle = typeColors[type];
      ctx.fillText(
        (u.counts[type] || 0).toString(),
        cellX + colWidths[i + 1] / 2,
        y + 28
      );
      cellX += colWidths[i + 1];
    });

    displayedIdx++;
  });

  /* -------------------- Footer -------------------- */
  ctx.textAlign = "center";
  ctx.fillStyle = "#888";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);

  return canvas.toBuffer();
}
