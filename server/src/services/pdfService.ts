import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api.d.js";

const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  pageTexts: string[];
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return "str" in item;
}

export async function extractPdf(buffer: Buffer): Promise<PdfExtractionResult> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let doc;
  try {
    doc = await getDocument({ data: uint8 }).promise;
  } catch {
    throw Object.assign(new Error("Failed to parse PDF"), { cause: "CORRUPT" });
  }

  const pageCount = doc.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter(isTextItem)
      .map((item) => item.str)
      .join(" ");
    pageTexts.push(text);
  }

  const fullText = pageTexts.join("\n\n");

  const avgCharsPerPage = fullText.trim().length / pageCount;
  if (avgCharsPerPage < 50) {
    throw Object.assign(
      new Error("PDF appears to be a scanned image with no extractable text"),
      { cause: "SCANNED_IMAGE" }
    );
  }

  return { text: fullText, pageCount, pageTexts };
}
