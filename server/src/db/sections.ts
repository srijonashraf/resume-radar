import pool from "../config/database.js";
import { createHash } from "crypto";
import type {
  ResumeDocument,
  DynamicSection,
  SectionItem,
  SectionScore,
  AtsReport,
  SectionMetric,
  AnalysisResultV2,
} from "@resumetra/shared";

interface SaveSectionsInput {
  userId: string | null;
  sourceType: "pdf" | "text";
  originalFileName?: string;
  inputText: string;
  sections: DynamicSection[];
  aiModelVersion: string;
}

export async function saveSections(
  input: SaveSectionsInput,
): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inputTextHash = createHash("sha256")
      .update(input.inputText)
      .digest("hex");

    // Create or update resume_analyses record
    const analysisResult = await client.query(
      `INSERT INTO public.resume_analyses (user_id, input_text_hash, original_file_name, source_type, ai_model_version, analysis_version, processing_time_ms)
       VALUES ($1, $2, $3, $4, $5, 1, 0)
       ON CONFLICT (user_id, input_text_hash) DO UPDATE SET
         ai_model_version = EXCLUDED.ai_model_version,
         updated_at = now()
       RETURNING id`,
      [
        input.userId,
        inputTextHash,
        input.originalFileName ?? null,
        input.sourceType,
        input.aiModelVersion,
      ],
    );

    const analysisId = analysisResult.rows[0].id;

    // Delete existing sections for this analysis (upsert pattern)
    await client.query(
      "DELETE FROM public.resume_sections WHERE analysis_id = $1",
      [analysisId],
    );

    // Insert sections
    for (const section of input.sections) {
      const { id: _id, displayOrder, title, type, items } = section;
      await client.query(
        `INSERT INTO public.resume_sections (analysis_id, section_type, section_title, display_order, section_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [analysisId, type, title, displayOrder, JSON.stringify(items)],
      );
    }

    await client.query("COMMIT");
    return analysisId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ── Load document for analysis pipeline ───────────────────

export async function loadAnalysisDocument(
  analysisId: string,
): Promise<{ document: ResumeDocument; userId: string } | null> {
  // Get analysis row for user_id
  const analysisResult = await pool.query(
    "SELECT user_id FROM public.resume_analyses WHERE id = $1",
    [analysisId],
  );

  if (analysisResult.rows.length === 0) return null;

  const userId = analysisResult.rows[0].user_id;

  // Get sections
  const sectionsResult = await pool.query(
    "SELECT section_type, section_title, display_order, section_data FROM public.resume_sections WHERE analysis_id = $1 ORDER BY display_order",
    [analysisId],
  );

  const sections: DynamicSection[] = sectionsResult.rows.map(
    (row, index) => ({
      id: `section-${index}`,
      type: row.section_type,
      title: row.section_title,
      displayOrder: row.display_order,
      items: (row.section_data ?? []) as SectionItem[],
    }),
  );

  const document: ResumeDocument = {
    contact: {
      fullName: "",
      email: "",
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      portfolio: null,
    },
    sections,
    detectedProfession: "generic",
    detectedCareerLevel: "all_levels",
  };

  return { document, userId };
}

// ── Pipeline v2 Persistence ──────────────────────────────────

interface SaveAnalysisResultsInput {
  analysisId: string;
  sectionMetrics: SectionMetric[];
  sectionScores: SectionScore[];
  atsReport: AtsReport | null;
  keywordFrequency: Record<string, number>;
}

export async function saveAnalysisResults(
  input: SaveAnalysisResultsInput,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Look up section DB UUIDs for this analysis
    const sectionRows = await client.query(
      "SELECT id, section_data FROM public.resume_sections WHERE analysis_id = $1 ORDER BY display_order",
      [input.analysisId],
    );

    // Map section_data item IDs to DB UUIDs
    const sectionIdMap = new Map<string, string>();
    for (const row of sectionRows.rows) {
      const items = row.section_data as { id?: string }[];
      if (items?.[0]?.id) {
        sectionIdMap.set(items[0].id, row.id);
      }
    }

    // Delete existing scores
    const dbSectionIds = Array.from(sectionIdMap.values());
    if (dbSectionIds.length > 0) {
      await client.query(
        `DELETE FROM public.resume_section_scores WHERE section_id = ANY($1)`,
        [dbSectionIds],
      );
    }

    // Delete existing ATS keywords
    if (input.atsReport) {
      await client.query(
        "DELETE FROM public.resume_ats_keywords WHERE analysis_id = $1",
        [input.analysisId],
      );
    }

    // Insert section scores
    for (const score of input.sectionScores) {
      const dbId = sectionIdMap.get(score.sectionId);
      if (!dbId) continue;

      await client.query(
        `INSERT INTO public.resume_section_scores (section_id, content_score, impact_score, issues)
         VALUES ($1, $2, $3, $4)`,
        [dbId, score.contentScore, score.impactScore, JSON.stringify(score.issues)],
      );
    }

    // Insert ATS keywords
    if (input.atsReport) {
      await client.query(
        `INSERT INTO public.resume_ats_keywords (analysis_id, resume_keywords, jd_keywords, matched_keywords, missing_keywords, match_score, keyword_report)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.analysisId,
          input.atsReport.resumeKeywords,
          input.atsReport.jdKeywords,
          input.atsReport.matchedKeywords,
          input.atsReport.missingKeywords,
          input.atsReport.matchScore,
          JSON.stringify({
            partialMatches: input.atsReport.partialMatches,
            sectionCoverage: input.atsReport.sectionCoverage,
            keywordFrequency: input.keywordFrequency,
          }),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadAnalysisResults(
  analysisId: string,
): Promise<AnalysisResultV2 | null> {
  // Query section scores
  const scoresResult = await pool.query(
    `SELECT rss.content_score, rss.impact_score, rss.issues, rs.section_data
     FROM public.resume_section_scores rss
     JOIN public.resume_sections rs ON rss.section_id = rs.id
     WHERE rs.analysis_id = $1`,
    [analysisId],
  );

  if (scoresResult.rows.length === 0) return null;

  // Query ATS keywords
  const atsResult = await pool.query(
    "SELECT * FROM public.resume_ats_keywords WHERE analysis_id = $1",
    [analysisId],
  );

  // Map scores
  const sectionScores: SectionScore[] = scoresResult.rows.map((row) => {
    const sectionData = row.section_data as { id?: string }[];
    const sectionId = sectionData?.[0]?.id ?? "unknown";
    return {
      sectionId,
      contentScore: parseFloat(row.content_score),
      impactScore: parseFloat(row.impact_score),
      issues: typeof row.issues === "string" ? JSON.parse(row.issues) : row.issues ?? [],
    };
  });

  // Map ATS report
  let atsReport: AtsReport | null = null;
  let keywordFrequency: Record<string, number> = {};

  if (atsResult.rows.length > 0) {
    const atsRow = atsResult.rows[0];
    let report = {};
    if (atsRow.keyword_report) {
      report = typeof atsRow.keyword_report === "string"
        ? JSON.parse(atsRow.keyword_report)
        : atsRow.keyword_report;
    }

    atsReport = {
      matchScore: parseFloat(atsRow.match_score),
      resumeKeywords: atsRow.resume_keywords ?? [],
      jdKeywords: atsRow.jd_keywords ?? [],
      matchedKeywords: atsRow.matched_keywords ?? [],
      missingKeywords: atsRow.missing_keywords ?? [],
      partialMatches: (report as Record<string, unknown>).partialMatches as AtsReport["partialMatches"] ?? [],
      sectionCoverage: (report as Record<string, unknown>).sectionCoverage as Record<string, boolean> ?? {},
    };
    keywordFrequency = (report as Record<string, unknown>).keywordFrequency as Record<string, number> ?? {};
  }

  return {
    deterministicMetrics: {
      wordCount: 0,
      bulletCount: 0,
      avgBulletWordCount: 0,
      sectionsPresent: [],
      sectionsMissing: [],
      bulletsWithActionVerb: 0,
      bulletsWithMetric: 0,
      formattingIssues: [],
      careerLevelDetected: "",
      totalExperienceMonths: 0,
    },
    sectionMetrics: [],
    sectionScores,
    readability: { score: 0, issues: [] },
    atsReport,
    keywordFrequency,
  };
}
