import { createCanvas, loadImage } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateDualLeaderboardImage(leaderboard, monthKey) {
  /* ---------- PREP: sort + count ---------- */
  const filteredTable = leaderboard.filter(u => {
    return ["misc", "rp", "raid", "event"].some(type => {
      if (type === "event") return (u.counts.event || 0) > 0;
      return (u.contributors[type]?.length || 0) > 0;
    });
  });

  const sortedTable = filteredTable.sort((a, b) => {
    const totalA = (a.counts.misc||0)+(a.counts.event||0)+(a.counts.rp||0)+(a.counts.raid||0);
    const totalB = (b.counts.misc||0)+(b.counts.event||0)+(b.counts.rp||0)+(b.counts.raid||0);
    return totalA - totalB;
  });

  const rowHeight = 48;
  const dynamicHeight = 650 + sortedTable.length * rowHeight + 200;

  /* ------------------ Canvas ------------------ */
  const width = 2400;
  const height = dynamicHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* ------------------ Futuristic Background ------------------ */
  // Deep gradient background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0a0a12");
  bg.addColorStop(1, "#06070d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Grid overlay (very faint)
  ctx.strokeStyle = "rgba(0,255,255,0.05)";
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

  /* ------------------ Neon Title ------------------ */
  const dateRangeStr = formatRavMonth(monthKey);

  ctx.font = "bold 60px 'Times New Roman'";
  ctx.textAlign = "left";
  ctx.shadowColor = "cyan";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#8efaff";
  ctx.fillText(`RAV Leaderboard — ${dateRangeStr}`, 80, 100);
  ctx.shadowBlur = 0;

  /* ------------------ Left Cyber Bar Chart ------------------ */
  const leftX = 80;
  const leftY = 180;
  const leftWidth = 700;
  const leftHeight = 450;

  const authorsOnly = leaderboard.filter(u => u.total > 0);
  const maxTotal = Math.max(...authorsOnly.map(u => u.total)) || 1;

  // Holographic panel
  ctx.fillStyle = "rgba(0, 255, 255, 0.06)";
  ctx.strokeStyle = "rgba(0,255,255,0.3)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(leftX - 40, leftY - 40, leftWidth + 80, leftHeight + 120, 20);
  ctx.fill();
  ctx.stroke();

  // Y-axis lines
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.font = "18px 'Times New Roman'";
  ctx.fillStyle = "#88c5ff";

  for (let i = 0; i <= maxTotal; i += Math.ceil(maxTotal / 5)) {
    const y = leftY + leftHeight - (i / maxTotal) * leftHeight;
    ctx.beginPath();
    ctx.moveTo(leftX, y);
    ctx.lineTo(leftX + leftWidth, y);
    ctx.stroke();
    ctx.fillText(i, leftX - 35, y + 6);
  }

  // Bars
  const barWidth = 50;
  const gap = 40;

  authorsOnly.forEach((u, idx) => {
    const barHeight = (u.total / maxTotal) * leftHeight;
    const x = leftX + idx * (barWidth + gap);
    const y = leftY + leftHeight - barHeight;

    // Neon gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, "#00f6ff");
    gradient.addColorStop(1, "#0040ff");

    ctx.shadowColor = "#00f6ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.shadowBlur = 0;

    // Value text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(u.total, x + barWidth / 2, y - 10);

    // Vertical tilted usernames
    ctx.save();
    ctx.translate(x + barWidth / 2, leftY + leftHeight + 55);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "#8efaff";
    ctx.font = "20px 'Times New Roman'";
    ctx.fillText(u.displayName, 0, 0);
    ctx.restore();
  });

  /* ------------------ Futuristic Table ------------------ */
  const rightX = 950;
  const rightY = 200;
  const colWidths = [300, 150, 150, 150, 150];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  // Panel
  ctx.fillStyle = "rgba(0, 255, 255, 0.07)";
  ctx.strokeStyle = "rgba(0,255,255,0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(rightX - 40, rightY - 120, tableWidth + 80, sortedTable.length * rowHeight + 220, 20);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.shadowColor = "cyan";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#8efaff";
  ctx.font = "bold 40px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText("Participation Breakdown", rightX + tableWidth / 2, rightY - 40);
  ctx.shadowBlur = 0;

  const typeColors = {
    misc: "#4ade80",
    event: "#60a5fa",
    rp: "#facc15",
    raid: "#f87171"
  };

  // Headers
  ctx.font = "bold 22px 'Times New Roman'";
  ctx.fillStyle = "#b7faff";
  let xOffset = rightX;
  ["User", "Misc", "Event", "RP", "Raid"].forEach((header, idx) => {
    ctx.fillText(header, xOffset + colWidths[idx] / 2, rightY + 10);
    xOffset += colWidths[idx];
  });

  /* Table rows */
  ctx.font = "20px 'Times New Roman'";
  sortedTable.forEach((u, index) => {
    const y = rightY + 40 + index * rowHeight;

    // Alternating hologram rows
    ctx.fillStyle = index % 2 === 0 ? "rgba(0,255,255,0.06)" : "rgba(0,255,255,0.0)";
    ctx.fillRect(rightX - 20, y, tableWidth + 40, rowHeight);

    // Name
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(u.displayName, rightX + colWidths[0] / 2, y + 30);

    // Counts
    let cx = rightX + colWidths[0];
    ["misc", "event", "rp", "raid"].forEach((type, i) => {
      ctx.fillStyle = typeColors[type];
      const count = u.counts[type] || 0;

      ctx.shadowColor = typeColors[type];
      ctx.shadowBlur = 12;
      ctx.fillText(count.toString(), cx + colWidths[i + 1] / 2, y + 30);
      ctx.shadowBlur = 0;

      cx += colWidths[i + 1];
    });
  });

  /* ------------------ Footer ------------------ */
  ctx.textAlign = "center";
  ctx.fillStyle = "#6f8a9e";
  ctx.font = "18px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager — Quantum Edition", width / 2, height - 40);

  return canvas.toBuffer();
}
