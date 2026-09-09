import * as XLSX from "xlsx";

export type LinkedInConnectionRow = {
  profileUrl: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  position: string | null;
  connectedOn: Date | null;
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseConnectedOn(raw: string | Date | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // LinkedIn uses "05 Jan 2026" or occasionally ISO-like formats.
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cellText(cell: unknown): string {
  if (cell == null) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

/**
 * Shared logic once the file (CSV or XLSX) has been reduced to rows of cells.
 * LinkedIn's export prefixes the real header with a few "Notes:" lines, so this
 * locates the actual "First Name,Last Name,..." row and ignores everything before it.
 */
function rowsToConnections(rows: unknown[][]): LinkedInConnectionRow[] {
  const headerIndex = rows.findIndex(
    (r) => r.some((c) => cellText(c) === "First Name") && r.some((c) => cellText(c) === "Last Name"),
  );
  if (headerIndex === -1) {
    throw new Error('Could not find the connections header row (expected a "First Name, Last Name, ..." row).');
  }

  const headers = rows[headerIndex].map(cellText);
  const col = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const idxFirst = col("First Name");
  const idxLast = col("Last Name");
  const idxUrl = col("URL");
  const idxEmail = col("Email Address");
  const idxCompany = col("Company");
  const idxPosition = col("Position");
  const idxConnectedOn = col("Connected On");

  const result: LinkedInConnectionRow[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const fields = rows[i];
    const firstName = cellText(fields[idxFirst]);
    const lastName = cellText(fields[idxLast]);
    if (!firstName && !lastName) continue;

    result.push({
      profileUrl: cellText(fields[idxUrl]) || `${firstName}-${lastName}`.toLowerCase(),
      firstName,
      lastName,
      email: cellText(fields[idxEmail]) || null,
      company: cellText(fields[idxCompany]) || null,
      position: cellText(fields[idxPosition]) || null,
      connectedOn: idxConnectedOn >= 0 ? parseConnectedOn(fields[idxConnectedOn] as string | Date | undefined) : null,
    });
  }

  return result;
}

export function parseLinkedInConnectionsCsv(csvText: string): LinkedInConnectionRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return rowsToConnections(lines.map(parseCsvLine));
}

export function parseLinkedInConnectionsXlsx(buffer: ArrayBuffer): LinkedInConnectionRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes("connection")) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  return rowsToConnections(rows);
}
