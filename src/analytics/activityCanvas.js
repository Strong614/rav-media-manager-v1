import { createCanvas } from "canvas";
import { formatRavMonth } from "../ui/formatRavMonth.js";

export async function generateActivityImage(stats, monthKey) {
  const width = 2000;
  const height = 1000;
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

  /* ───── Prepare entries & sort descending ───── */
  const entries = [
    { label: "Misc", value: stats.misc },
    { label: "Events", value: stats.event },
    { label: "Roleplays", value: stats.roleplay },
    { label: "Raids", value: stats.raid }
  ];

  entries.sort((a, b) => b.value - a.value);
  const total = entries.reduce((acc, e) => acc + e.value, 0);

  /* ───── Grid lines ───── */
  const max = Math.max(...entries.map(e => e.value), 1);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.font = "14px 'Times New Roman'";
  ctx.fillStyle = "#bbb";

  const baseY = 620;           // ⬇ diagram moved down
  const chartHeight = 360;

  const step = Math.ceil(max / 5) || 1;
  for (let i = 0; i <= max; i += step) {
    const y = baseY - (i / max) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(width - 60, y);
    ctx.stroke();
    ctx.fillText(i, 50, y + 5);
  }

  /* ───── Draw bars ───── */
  const barWidth = 120;
  const gap = 80;
  const startX = 120;
  const maxValue = Math.max(...entries.map(e => e.value));

  entries.forEach((e, i) => {
    const barHeight = (e.value / max) * chartHeight;
    const x = startX + i * (barWidth + gap);
    const y = baseY - barHeight;

    /* Cyan / blue gradient */
    const gradient = ctx.createLinearGradient(x, y, x, baseY);
    gradient.addColorStop(0, "#67e8f9");
    gradient.addColorStop(1, "#0891b2");
    ctx.fillStyle = gradient;

    /* Highlight highest bar */
    if (e.value === maxValue) {
      ctx.shadowColor = "rgba(255,255,255,0.35)";
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 10;
    }
    ctx.shadowOffsetY = 5;

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";

    /* Value label */
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Times New Roman'";
    ctx.textAlign = "center";
    ctx.fillText(e.value, x + barWidth / 2, y - 10);

    /* Category label */
    ctx.save();
    ctx.translate(x + barWidth / 2, baseY + 52);
    ctx.rotate(-Math.PI / 6);
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "rgba(221,221,221,0.85)";
    ctx.textAlign = "right";
    ctx.fillText(e.label, 0, 0);
    ctx.restore();
  });

  /* ───── Total summary card ───── */
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(width - 420, 95, 360, 70);

  ctx.textAlign = "center";
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 26px 'Times New Roman'";
  ctx.fillText("Total Posts", width - 240, 120);

  ctx.font = "bold 34px 'Times New Roman'";
  ctx.fillText(total, width - 240, 155);

    /* ───── Summary table (right side, structured like mockup) ───── */
  const tableX = width - 900;
  const tableY = 190;
  const labelColWidth = 360;
  const valueColWidth = 140;
  const imageColWidth = 360;
  const rowHeight = 90;

  const rows = [
    ...entries,
    { label: "Total Posts", value: total, isTotal: true }
  ];

  const tableHeight = rows.length * rowHeight;

  /* White background */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    tableX,
    tableY,
    labelColWidth + valueColWidth + imageColWidth,
    tableHeight
  );

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;

  /* Vertical separators */
  ctx.beginPath();
  ctx.moveTo(tableX + labelColWidth, tableY);
  ctx.lineTo(tableX + labelColWidth, tableY + tableHeight);
  ctx.moveTo(tableX + labelColWidth + valueColWidth, tableY);
  ctx.lineTo(tableX + labelColWidth + valueColWidth, tableY + tableHeight);
  ctx.stroke();

  /* Horizontal lines (left + middle columns only) */
  rows.forEach((_, i) => {
    const y = tableY + i * rowHeight;
    ctx.beginPath();
    ctx.moveTo(tableX, y);
    ctx.lineTo(tableX + labelColWidth + valueColWidth, y);
    ctx.stroke();
  });

  /* Outer border */
  ctx.strokeRect(
    tableX,
    tableY,
    labelColWidth + valueColWidth + imageColWidth,
    tableHeight
  );

  /* Cell text */
  rows.forEach((row, i) => {
    const centerY = tableY + i * rowHeight + rowHeight / 2 + 10;

    ctx.font = row.isTotal
      ? "bold 34px 'Times New Roman'"
      : "32px 'Times New Roman'";

    ctx.fillStyle = row.isTotal ? "#2f5d1e" : "#000000";

    /* Label */
    ctx.textAlign = "left";
    ctx.fillText(row.label, tableX + 30, centerY);

    /* Value */
    ctx.textAlign = "center";
    ctx.fillText(
      row.value,
      tableX + labelColWidth + valueColWidth / 2,
      centerY
    );
  });

  /* Optional placeholder for image panel (keeps layout exact) */
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(
    tableX + labelColWidth + valueColWidth + 20,
    tableY + 20,
    imageColWidth - 40,
    tableHeight - 40
  );
  ctx.setLineDash([]);


  /* ───── Footer ───── */
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "14px 'Times New Roman'";
  ctx.fillText("Generated by RAV Media Manager", width / 2, height - 30);

  return canvas.toBuffer();
}
