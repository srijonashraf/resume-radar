import type { ContactInfo, DynamicSection, ResumeDocument } from "@resumetra/shared";
import { callTool } from "../services/aiService.js";
import {
  detectSectionsTool,
  extractContactTool,
  extractSectionTool,
  allExtractionTools,
  detectSectionsResponseSchema,
  extractContactResponseSchema,
  extractSectionResponseSchema,
} from "./extractTools.js";
import { EXTRACTION_SYSTEM_PROMPT } from "./extractPrompts.js";

export type SSESender = (event: string, data: unknown) => void;

export async function extractResume(
  rawText: string,
  sendSSE: SSESender,
): Promise<ResumeDocument> {
  const messages: Parameters<typeof callTool>[0] = [
    { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
    { role: "user", content: rawText },
  ];

  // Step 1: Detect sections
  sendSSE("extracting", { sectionName: "sections", index: 0, total: 0 });
  const sectionsResult = await callTool(
    messages,
    [detectSectionsTool],
    "detect_sections",
    detectSectionsResponseSchema,
  );
  const detectedSections = sectionsResult.data.sections;

  // Step 2: Extract contact info (no progress event — fast, internal step)
  const contactResult = await callTool(
    messages,
    [extractContactTool],
    "extract_contact",
    extractContactResponseSchema,
  );
  const contact: ContactInfo = contactResult.data;

  // Step 3: Extract each section
  const sections: DynamicSection[] = [];
  const totalSections = detectedSections.length;

  for (let i = 0; i < detectedSections.length; i++) {
    const detected = detectedSections[i];
    const sectionId = `section-${i}`;
    const sectionText = rawText.slice(detected.startIndex, detected.endIndex);

    sendSSE("extracting", {
      sectionName: detected.title,
      index: i,
      total: totalSections,
    });

    try {
      const sectionResult = await callTool(
        [
          ...messages,
          {
            role: "user",
            content: `Extract this section:\n\n${sectionText}`,
          },
        ],
        [extractSectionTool],
        "extract_section",
        extractSectionResponseSchema,
      );

      const extracted = sectionResult.data;
      sections.push({
        id: sectionId,
        type: extracted.type,
        title: extracted.title,
        displayOrder: i,
        items: extracted.items.map((item, j) => ({
          id: `item-${i}-${j}`,
          ...item,
        })),
      });
    } catch {
      // Raw fallback on failure
      sections.push({
        id: sectionId,
        type: "raw",
        title: detected.title,
        displayOrder: i,
        items: [
          {
            id: `item-${i}-0`,
            rawText: sectionText,
          },
        ],
      });
    }
  }

  // Step 4: Deduplicate sections by title (case-insensitive)
  const dedupedSections = deduplicateSections(sections);

  return {
    contact,
    sections: dedupedSections,
    detectedProfession: "generic",
    detectedCareerLevel: "all_levels",
  };
}

/** Title aliases that should be treated as the same semantic section. */
const SECTION_ALIASES: Record<string, string[]> = {
  summary: ["summary", "profile", "professional summary", "about", "objective", "career objective"],
  experience: ["experience", "work experience", "professional experience", "work history", "employment history"],
  education: ["education", "academic background", "education and training"],
  skills: ["skills", "technical skills", "core competencies", "competencies", "areas of expertise"],
  projects: ["projects", "personal projects", "key projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses and certifications", "professional certifications"],
};

function getCanonicalTitle(title: string): string {
  const lower = title.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((alias) => lower === alias || lower.includes(alias))) {
      return canonical;
    }
  }
  return lower;
}

function deduplicateSections(sections: DynamicSection[]): DynamicSection[] {
  const seen = new Map<string, DynamicSection>();

  for (const section of sections) {
    const key = getCanonicalTitle(section.title);

    if (seen.has(key)) {
      // Merge: keep the one with more items
      const existing = seen.get(key)!;
      if (section.items.length > existing.items.length) {
        seen.set(key, section);
      }
    } else {
      seen.set(key, section);
    }
  }

  // Re-index displayOrder after dedup
  const result = Array.from(seen.values());
  for (let i = 0; i < result.length; i++) {
    result[i] = { ...result[i], displayOrder: i };
  }

  return result;
}
