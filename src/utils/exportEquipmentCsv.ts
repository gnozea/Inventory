import type { EquipmentItem } from "../types/equipment";

export function exportEquipmentCsv(
  rows: EquipmentItem[],
  filename = "equipment.csv"
) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => `"${String(row[h as keyof EquipmentItem] ?? "")}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}