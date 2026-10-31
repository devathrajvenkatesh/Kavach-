/**
 * Kavach - Safe File Parser & Untrusted Content Extractor
 *
 * Implements deterministic text extraction from untrusted external files:
 * - PDF documents (via stream decompression & BT/ET text extraction)
 * - Emails (RFC 822 .eml format with header decoding and body normalization)
 * - CSV / TSV spreadsheets
 * - JSON structured payloads
 * - Plaintext & Markdown documents
 *
 * Security Invariant:
 * All extracted content is classified as TrustLevel.EXTERNAL_CONTENT (1).
 * Parsers NEVER execute embedded scripts, macros, or active content.
 */

import zlib from "zlib";

export interface ExtractedFileContent {
  fileName: string;
  fileType: "PDF" | "Email" | "Text" | "Spreadsheet" | "JSON" | "Document";
  mimeType: string;
  sizeBytes: number;
  formattedSize: string;
  extractedText: string;
  charCount: number;
  lineCount: number;
  pageCount?: number;
  headers?: Record<string, string>;
  isParsedSuccessfully: boolean;
  warnings?: string[];
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extracts readable text streams from PDF buffers
 */
export function extractTextFromPDF(buffer: Buffer): { text: string; pageCount: number } {
  const rawString = buffer.toString("binary");

  // 1. Estimate page count from PDF catalog
  const pageMatches = rawString.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  const extractedChunks: string[] = [];

  // 2. Scan and decompress FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawString)) !== null) {
    const rawStream = match[1];
    let decompressed: string | null = null;

    try {
      const streamBuf = Buffer.from(rawStream, "binary");
      const unzipped = zlib.inflateSync(streamBuf);
      decompressed = unzipped.toString("utf-8");
    } catch {
      // Stream might not be FlateDecode compressed or may use raw binary
      decompressed = rawStream;
    }

    if (decompressed) {
      // Extract text from (text) Tj and [(text)] TJ operators
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
        const cleaned = cleanPdfString(tjMatch[1]);
        if (cleaned.trim()) extractedChunks.push(cleaned);
      }

      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = tjArrayRegex.exec(decompressed)) !== null) {
        const inner = arrayMatch[1];
        const innerStrings = inner.match(/\(([^)]*)\)/g);
        if (innerStrings) {
          const combined = innerStrings
            .map((s) => cleanPdfString(s.slice(1, -1)))
            .join(" ");
          if (combined.trim()) extractedChunks.push(combined);
        }
      }
    }
  }

  // 3. Fallback: extract visible text from raw string if streams yielded little
  let combined = extractedChunks.join("\n").trim();
  if (combined.length < 20) {
    const textMatches = rawString.match(/\(([^)]{4,})\)/g);
    if (textMatches && textMatches.length > 0) {
      combined = textMatches
        .map((s) => cleanPdfString(s.slice(1, -1)))
        .filter((s) => /[a-zA-Z0-9]/.test(s))
        .join(" ");
    }
  }

  // If still completely empty or raw, clean unprintable chars
  if (!combined) {
    combined = rawString
      .replace(/[^\x20-\x7E\r\n\t]/g, " ")
      .replace(/\s{2,}/g, " ")
      .slice(0, 5000)
      .trim();
  }

  return { text: combined, pageCount: Math.max(1, pageCount) };
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\([\\()])/g, "$1")
    .trim();
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBodyPart(body: string, encoding: string): string {
  const enc = encoding.toLowerCase().trim();
  if (enc === "base64") {
    try {
      const cleanB64 = body.replace(/[\r\n\s]+/g, "");
      return Buffer.from(cleanB64, "base64").toString("utf-8");
    } catch {
      return body;
    }
  }
  return decodeQuotedPrintable(body);
}

/**
 * Extracts headers and body from RFC 822 Email format (.eml)
 */
export function extractTextFromEmail(content: string): {
  text: string;
  headers: Record<string, string>;
} {
  const headers: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  let headerBoundaryIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      headerBoundaryIndex = i;
      break;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      headers[key] = val;
    }
  }

  const rawBody =
    headerBoundaryIndex !== -1
      ? lines.slice(headerBoundaryIndex + 1).join("\n")
      : content;

  let extractedBody = "";
  const contentType = headers["content-type"] || "";
  const transferEncoding = headers["content-transfer-encoding"] || "";

  // 1. Check if multipart email with boundary
  const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const rawParts = rawBody.split(new RegExp(`--${boundary}(?:--)?`));
    const decodedParts: string[] = [];

    for (const part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed === "--") continue;

      const headerEnd = trimmed.search(/\r?\n\r?\n/);
      if (headerEnd === -1) {
        decodedParts.push(trimmed);
        continue;
      }

      const partHeadersStr = trimmed.slice(0, headerEnd);
      const partBody = trimmed.slice(headerEnd).trim();

      const partEncodingMatch = partHeadersStr.match(/content-transfer-encoding:\s*([^\r\n;]+)/i);
      const partEncoding = partEncodingMatch ? partEncodingMatch[1].trim() : "";

      decodedParts.push(decodeBodyPart(partBody, partEncoding));
    }

    if (decodedParts.length > 0) {
      extractedBody = decodedParts.join("\n\n");
    }
  }

  // 2. If not multipart or multipart extraction was empty, decode single body
  if (!extractedBody) {
    extractedBody = decodeBodyPart(rawBody, transferEncoding);
  }

  // Clean HTML markup if text/html was ingested
  if (contentType.includes("html") || extractedBody.includes("<html") || extractedBody.includes("<body")) {
    extractedBody = extractedBody
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  const subject = headers["subject"] || "No Subject";
  const from = headers["from"] || "Unknown Sender";
  const to = headers["to"] || "Undisclosed Recipients";
  const date = headers["date"] || "Unknown Date";

  const formatted = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    "",
    "--- EMAIL BODY ---",
    extractedBody.trim(),
  ].join("\n");

  return { text: formatted, headers };
}

/**
 * Formats CSV/TSV into tabular text
 */
export function extractTextFromSpreadsheet(content: string): string {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return "";
  const header = lines[0];
  const rows = lines.slice(1, 100); // cap to 100 rows for preview

  return [
    `Tabular Data (${lines.length} rows):`,
    `Columns: ${header}`,
    "",
    ...rows,
  ].join("\n");
}

/**
 * Main file parser function: accepts buffer or string and normalizes to ExtractedFileContent
 */
export function parseUploadedFile(input: {
  fileName: string;
  mimeType?: string;
  bufferOrText: Buffer | string;
}): ExtractedFileContent {
  const { fileName, bufferOrText } = input;
  const warnings: string[] = [];

  const buffer =
    typeof bufferOrText === "string"
      ? Buffer.from(bufferOrText, "utf-8")
      : bufferOrText;

  const sizeBytes = buffer.length;
  const formattedSize = formatBytes(sizeBytes);
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  let fileType: ExtractedFileContent["fileType"] = "Document";
  let extractedText = "";
  let pageCount: number | undefined;
  let headers: Record<string, string> | undefined;

  // Determine file type and parse safely
  if (ext === "pdf" || input.mimeType === "application/pdf") {
    fileType = "PDF";
    try {
      const pdfRes = extractTextFromPDF(buffer);
      extractedText = pdfRes.text;
      pageCount = pdfRes.pageCount;
    } catch (err) {
      warnings.push(`PDF parsing warning: ${err instanceof Error ? err.message : String(err)}`);
      extractedText = buffer.toString("utf-8", 0, Math.min(buffer.length, 10000));
    }
  } else if (
    ext === "eml" ||
    ext === "email" ||
    input.mimeType === "message/rfc822"
  ) {
    fileType = "Email";
    const textContent = buffer.toString("utf-8");
    const emailRes = extractTextFromEmail(textContent);
    extractedText = emailRes.text;
    headers = emailRes.headers;
  } else if (
    ext === "csv" ||
    ext === "tsv" ||
    input.mimeType === "text/csv"
  ) {
    fileType = "Spreadsheet";
    extractedText = extractTextFromSpreadsheet(buffer.toString("utf-8"));
  } else if (
    ext === "json" ||
    input.mimeType === "application/json"
  ) {
    fileType = "JSON";
    try {
      const parsed = JSON.parse(buffer.toString("utf-8"));
      extractedText = JSON.stringify(parsed, null, 2);
    } catch {
      extractedText = buffer.toString("utf-8");
    }
  } else {
    fileType = "Text";
    extractedText = buffer.toString("utf-8");
  }

  const lines = extractedText.split(/\r?\n/);
  const lineCount = lines.length;
  const charCount = extractedText.length;

  return {
    fileName,
    fileType,
    mimeType: input.mimeType || `application/x-${ext || "octet-stream"}`,
    sizeBytes,
    formattedSize,
    extractedText,
    charCount,
    lineCount,
    pageCount,
    headers,
    isParsedSuccessfully: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
