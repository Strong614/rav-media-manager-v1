import { createCanvas } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateDualLeaderboardImage(leaderboard, monthKey) {
  /* -------------------- Table Prep -------------------- */
  const filteredTable = leaderboard.filter(u =>
    ["misc", "rp", "raid", "event"].some(type => {
      if (type === "event") return (u.counts.event || 0) > 0;
      return (u.contributors[type]?.length || 0) > 0;
    })
  );

  // Sort ascending by total activity
  const sortedTable = filteredTable.sort((a, b) => {
    const totalA = (a.counts.misc || 0) + (a.counts.event || 0) + (a.counts.rp || 0) + (a.counts.raid || 0);
    const totalB = (b.counts.misc || 0) + (b.counts.event || 0) + (b.counts.rp || 0) + (b.counts.raid || 0);
    return totalA - totalB;
  });

  const rowHeight = 45;
  const tableRows = sortedTable.length;
  const dynamicHeight = 600 + tableRows * rowHeight + 150;

  /* -------------------- Canvas -------------------- */
  const width = 2000;
  const height = dynamicHeight;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* -------------------- Background -------------------- */
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#020402");
  bg.addColorStop(1, "#000701");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Tactical grid overlay
  ctx.strokeStyle = "rgba(0,255,0,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  /* -------------------- Title -------------------- */
  const dateRangeStr = formatRavMonth(monthKey);
  ctx.font = "bold 50px 'Courier New'";
  ctx.textAlign = "left";
  ctx.fillStyle = "#00ff44";
  ctx.shadowColor = "#00ff44";
  ctx.shadowBlur = 20;
  ctx.fillText(`RAV Leaderboard | ${dateRangeStr}`, 60, 80);
  ctx.shadowBlur = 0;

  /* -------------------- Left Bar Chart (Holographic) -------------------- */
  const leftX = 60;
  const leftY = 150;
  const leftWidth = 600;
  const leftHeight = 400;

  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  // Y-axis grid lines
  ctx.strokeStyle = "rgba(0,255,0,0.2)";
  ctx.lineWidth = 2;
  ctx.font = "16px 'Courier New'";
  ctx.fillStyle = "#00ff44";
  for (let i = 0; i <= maxTotal; i += Math.ceil(maxTotal / 5)) {
    const y = leftY + leftHeight - (i / maxTotal) * leftHeight;
    ctx.beginPath();
    ctx.moveTo(leftX - 30, y);
    ctx.lineTo(leftX + leftWidth, y);
    ctx.stroke();
    ctx.fillText(i, leftX - 50, y + 6);
  }

  const barWidth = 50;
  const gap = 35;
  authorsOnly.forEach((u, idx) => {
    const barHeight = (u.total / maxTotal) * leftHeight;
    const x = leftX + idx * (barWidth + gap);
    const y = leftY + leftHeight - barHeight;

    // Neon green gradient bar
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, "#00ff44");
    gradient.addColorStop(1, "#007700");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "#00ff44";
    ctx.shadowBlur = 15;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.shadowBlur = 0;

    // Bar value
    ctx.fillStyle = "#00ff44";
    ctx.font = "bold 18px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, x + barWidth / 2, y - 10);

    // Tilted author name
    ctx.save();
    ctx.translate(x + barWidth / 2, leftY + leftHeight + 40);
    ctx.rotate(-Math.PI / 4);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* -------------------- Right Table -------------------- */
  const rightX = 800;
  const rightY = 200;
  const colWidths = [280, 120, 120, 120, 120];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Holographic panel
  ctx.fillStyle = "rgba(0,255,0,0.06)";
  ctx.strokeStyle = "rgba(0,255,0,0.3)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(rightX - 40, rightY - 120, tableWidth + 80, tableRows * rowHeight + 220, 20);
  ctx.fill();
  ctx.stroke();

  // Table title
  ctx.font = "bold 36px 'Courier New'";
  ctx.fillStyle = "#00ff44";
  ctx.shadowColor = "#00ff44";
  ctx.shadowBlur = 12;
  ctx.textAlign = "center";
  ctx.fillText("Participation Breakdown", rightX + tableWidth / 2, rightY - 50);
  ctx.shadowBlur = 0;

  // Table headers
  const typeColors = {
    misc: "#00ff44",
    event: "#00ff88",
    rp: "#00cc44",
    raid: "#00aa33"
  };
  ctx.font = "bold 20px 'Courier New'";
  ctx.fillStyle = "#00ff44";
  let xOffset = rightX;
  ["User", "Misc", "Event", "RP", "Raid"].forEach((header, idx) => {
    ctx.fillText(header, xOffset + colWidths[idx] / 2, rightY - 10);
    xOffset += colWidths[idx];
  });

  // Render sorted table rows
  ctx.font = "18px 'Courier New'";
  sortedTable.forEach((u, index) => {
    const y = rightY + index * rowHeight;

    // Alternate row holographic shading
    ctx.fillStyle = index % 2 === 0 ? "rgba(0,255,0,0.05)" : "transparent";
    ctx.fillRect(rightX - 20, y, tableWidth + 40, rowHeight);

    // User name
    ctx.fillStyle = "#00ff44";
    ctx.textAlign = "center";
    ctx.fillText(u.displayName, rightX + colWidths[0] / 2, y + 28);

    // Counts
    let cx = rightX + colWidths[0];
    ["misc", "event", "rp", "raid"].forEach((type, i) => {
      const count = u.counts[type] || 0;
      ctx.fillStyle = typeColors[type];
      ctx.shadowColor = typeColors[type];
      ctx.shadowBlur = 10;
      ctx.fillText(count.toString(), cx + colWidths[i + 1] / 2, y + 28);
      ctx.shadowBlur = 0;
      cx += colWidths[i + 1];
    });
  });

  /* -------------------- Footer -------------------- */
  ctx.textAlign = "center";
  ctx.fillStyle = "#007700";
  ctx.font = "16px 'Courier New'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);

  return canvas.toBuffer();
}
