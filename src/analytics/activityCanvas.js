import { createCanvas, loadImage } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateActivityImage(stats, monthKey) {
  const width = 2000;
  const height = 1200;

  const chartAreaWidth = Math.floor(width * 0.6);
  const tableAreaWidth = width - chartAreaWidth;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  /* ───── Background ───── */
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#1e1f24");
  bg.addColorStop(1, "#14151a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  /* ───── Title ───── */
  ctx.fillStyle = "#a2C6Ca";
  ctx.font = "bold 42px 'Times New Roman'";
  ctx.textAlign = "left";
  const dateRangeStr = formatRavMonth(monthKey);
  ctx.fillText(`RAV Activity Overview | ${dateRangeStr}`, 50, 60);

  /* Divider */
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 80);
  ctx.lineTo(width - 50, 80);
  ctx.stroke();

  /* ───── Data prep ───── */
  const entries = [
    { label: "Misc", value: stats.misc || 0 },
    { label: "Events", value: stats.event || 0 },
    { label: "Roleplays", value: stats.roleplay || 0 },
    { label: "Raids", value: stats.raid || 0 }
  ];

  entries.sort((a, b) => b.value - a.value);
  const total = entries.reduce((sum, e) => sum + e.value, 0);

  /* ───── Grid lines (chart only) ───── */
  const max = Math.max(...entries.map(e => e.value), 1);
  const baseY = 620;
  const chartHeight = 360;

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.font = "14px 'Times New Roman'";
  ctx.fillStyle = "#bbb";

  const step = Math.ceil(max / 5);
  for (let i = 0; i <= max; i += step) {
    const y = baseY - (i / max) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(chartAreaWidth - 60, y);
    ctx.stroke();
    ctx.fillText(i, 50, y + 5);
  }

  /* ───── Bars ───── */
  const barWidth = 120;
  const gap = 80;
  const startX = 120;
  const maxValue = Math.max(...entries.map(e => e.value));

  entries.forEach((e, i) => {
    const barHeight = (e.value / max) * chartHeight;
    const x = startX + i * (barWidth + gap);
    const y = baseY - barHeight;

    const gradient = ctx.createLinearGradient(x, y, x, baseY);
    gradient.addColorStop(0, "#67e8f9");
    gradient.addColorStop(1, "#0891b2");
    ctx.fillStyle = gradient;

    ctx.shadowColor =
      e.value === maxValue ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = e.value === maxValue ? 18 : 10;
    ctx.shadowOffsetY = 5;

    if (barHeight > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 8);
      ctx.fill();
    }

    // Reset shadow fully so it doesn't bleed onto text/lines
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px 'Times New Roman'";
    ctx.textAlign = "center";
    if (e.value > 0) ctx.fillText(e.value, x + barWidth / 2, y - 10);

    ctx.save();
    ctx.translate(x + barWidth / 2, baseY + 52);
    ctx.rotate(-Math.PI / 6);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "rgba(221,221,221,0.85)";
    ctx.textAlign = "right";
    ctx.fillText(e.label, 0, 0);
    ctx.restore();
  });

  /* ───── Vertical separator ───── */
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartAreaWidth, 100);
  ctx.lineTo(chartAreaWidth, height - 80);
  ctx.stroke();

  /* ───── Summary card ───── */
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(chartAreaWidth + 80, 95, tableAreaWidth - 160, 70);

  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 26px 'Times New Roman'";
  ctx.textAlign = "center";
  ctx.fillText("Total Activities", chartAreaWidth + tableAreaWidth / 2, 120);

  ctx.font = "bold 34px 'Times New Roman'";
  ctx.fillText(total, chartAreaWidth + tableAreaWidth / 2, 155);

  /* ───── Table (labels & values only, improved spacing) ───── */
  const tableX = chartAreaWidth + 60;
  const tableY = 190;
  const rowHeight = 80;
  const labelColWidth = Math.floor(tableAreaWidth * 0.55);
  const valueColWidth = Math.floor(tableAreaWidth * 0.35);

  const rows = [...entries, { label: "Total Activities", value: total, isTotal: true }];
  const tableHeight = rows.length * rowHeight;

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(tableX + labelColWidth, tableY);
  ctx.lineTo(tableX + labelColWidth, tableY + tableHeight);
  ctx.stroke();

  // Horizontal lines
  rows.forEach((_, i) => {
    const y = tableY + i * rowHeight;
    ctx.beginPath();
    ctx.moveTo(tableX, y);
    ctx.lineTo(tableX + labelColWidth + valueColWidth, y);
    ctx.stroke();
  });

  ctx.strokeRect(tableX, tableY, labelColWidth + valueColWidth, tableHeight);

  // Fill table text
  rows.forEach((row, i) => {
    const centerY = tableY + i * rowHeight + rowHeight / 2;
    ctx.font = row.isTotal ? "bold 34px 'Times New Roman'" : "32px 'Times New Roman'";
    ctx.fillStyle = row.isTotal ? "#22d3ee" : "#ffffff";

    ctx.textAlign = "left";
    ctx.fillText(row.label, tableX + 20, centerY + 10);

    ctx.textAlign = "right";
    ctx.fillText(row.value, tableX + labelColWidth + valueColWidth - 20, centerY + 10);
  });

  /* ───── Footer logo ───── */
  const logo = await loadImage(path.join(__dirname, "../assets/rav_logo.png"));

  const logoMaxWidth = 120;
  const logoMaxHeight = 120;
  const scale = Math.min(logoMaxWidth / logo.width, logoMaxHeight / logo.height);
  const drawW = logo.width * scale;
  const drawH = logo.height * scale;

  const logoX = width / 2 - drawW / 2;
  const logoY = height - 100 - drawH; // just above footer text
  ctx.drawImage(logo, logoX, logoY, drawW, drawH);

  /* ───── Footer text ───── */
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 40);

  return canvas.toBuffer();
}
