import type {
  ContactInfo,
  DynamicSection,
  ResumeDocument,
  AnalysisResultV2,
  Rewrite,
} from "@resumetra/shared";
import { extractPdf } from "./pdfService.js";
import { validateResume } from "../stages/stage0_validate.js";
import { extractResume } from "../stages/stage1_extract.js";
import { detectProfession } from "../stages/detectProfession.js";
import { detectCareerLevel } from "../stages/detectCareerLevel.js";
import { getKnowledgeBase } from "../knowledge/registry.js";
import { saveSections, loadAnalysisDocument, loadAnalysisResults, saveAnalysisResults } from "../db/sections.js";
import { computeDeterministicMetrics, type MetricsOutput } from "../stages/stage2_metrics.js";
import { computeAtsFormattingScore, computeKeywordMatchScore } from "../stages/atsScoring.js";
import { runAnalysisAgent } from "../stages/stage3_analysis.js";
import { runTailorAgent } from "../stages/stage4_tailoring.js";
import { callTool } from "./aiService.js";
import { extractJdKeywordsTool, extractJdKeywordsResponseSchema } from "../stages/analysisTools.js";
import { saveRewrites } from "../db/rewrites.js";

export type PipelineSSESender = (event: string, data: unknown) => void;

export interface ExtractionResult {
  document: ResumeDocument;
  profession: { professionId: string; confidence: number };
  careerLevel: { levelId: string; label: string; totalMonths: number };
  sectionCoverage: {
    required: { name: string; present: boolean }[];
    recommended: { name: string; present: boolean }[];
    optional: { name: string; present: boolean }[];
  };
}

export async function runExtractionPipeline(
  input: {
    pdfBuffer?: Buffer;
    text?: string;
    userId?: string | null;
    originalFileName?: string;
    aiModelVersion?: string;
  },
  sendSSE: PipelineSSESender,
): Promise<ExtractionResult & { analysisId?: string }> {
  // Step 1: Get text and page count
  let text: string;
  let pageCount: number;

  if (input.pdfBuffer) {
    const pdf = await extractPdf(input.pdfBuffer);
    text = pdf.text;
    pageCount = pdf.pageCount;
  } else if (input.text) {
    text = input.text;
    pageCount = Math.max(1, Math.ceil(text.length / 3000));
  } else {
    throw new Error("Either pdfBuffer or text must be provided");
  }

  // Step 2: Validate
  sendSSE("validating", { message: "Validating document..." });
  const validation = validateResume(text, pageCount);
  if (validation.outcome !== "VALID") {
    sendSSE("error", {
      error: validation.message,
      outcome: validation.outcome,
    });
    throw Object.assign(new Error(validation.message), {
      outcome: validation.outcome,
    });
  }

  // Step 3: Extract
  const document = await extractResume(text, sendSSE);

  // Step 4: Detect profession
  const profession = detectProfession(document.sections);

  // Step 5: Detect career level
  const careerLevel = detectCareerLevel(
    document.sections,
    profession.professionId,
  );

  // Step 6: Compute section coverage from KB
  const sectionCoverage = computeSectionCoverage(
    document.sections,
    profession.professionId,
    careerLevel.levelId,
    document.contact,
  );

  // Update document with detected profession/level
  document.detectedProfession = profession.professionId;
  document.detectedCareerLevel = careerLevel.levelId;

  // Step 7: Persist sections for authenticated users
  let analysisId: string | undefined;
  if (input.userId) {
    try {
      analysisId = await saveSections({
        userId: input.userId,
        sourceType: input.pdfBuffer ? "pdf" : "text",
        originalFileName: input.originalFileName,
        inputText: text,
        sections: document.sections,
        aiModelVersion: input.aiModelVersion ?? "unknown",
      });
    } catch (dbError) {
      console.error("Failed to persist sections:", dbError);
    }
  }

  return { document, profession, careerLevel, sectionCoverage, analysisId };
}

// ── Analysis Pipeline (Phase 2) ────────────────────────────────

export async function runAnalysisPipeline(
  input: {
    analysisId: string;
    jobDescription?: string;
  },
  sendSSE: PipelineSSESender,
): Promise<AnalysisResultV2> {
  // Step 1: Load document from DB
  const loaded = await loadAnalysisDocument(input.analysisId);
  if (!loaded) {
    throw new Error("Analysis not found");
  }

  const { document, userId: _userId } = loaded;

  // Step 2: Re-detect profession + career level (pure functions)
  const profession = detectProfession(document.sections);
  const careerLevel = detectCareerLevel(
    document.sections,
    profession.professionId,
  );
  const kb = getKnowledgeBase(profession.professionId);

  document.detectedProfession = profession.professionId;
  document.detectedCareerLevel = careerLevel.levelId;

  const sectionCoverage = computeSectionCoverage(
    document.sections,
    profession.professionId,
    careerLevel.levelId,
    document.contact,
  );

  // Step 3: Deterministic metrics
  sendSSE("computing_metrics", { message: "Computing deterministic metrics..." });
  const metrics = computeDeterministicMetrics(document, kb, sectionCoverage);
  sendSSE("metrics_complete", { metrics });

  // Step 4: ATS scoring (if JD provided)
  let atsReport: AnalysisResultV2["atsReport"] = null;

  if (input.jobDescription) {
    try {
      const jdResult = await callTool(
        [
          {
            role: "user",
            content: `Extract keywords from this job description:\n\n${input.jobDescription}`,
          },
        ],
        [extractJdKeywordsTool],
        "extract_jd_keywords",
        extractJdKeywordsResponseSchema,
      );

      const jdKeywords = [
        ...jdResult.data.skills,
        ...jdResult.data.tools,
        ...jdResult.data.requirements,
        ...jdResult.data.softSkills,
      ];

      const formattingScore = computeAtsFormattingScore(metrics, kb);
      const allCoverage = [
        ...sectionCoverage.required,
        ...sectionCoverage.recommended,
        ...sectionCoverage.optional,
      ];
      const coverageMap: Record<string, boolean> = {};
      for (const c of allCoverage) {
        coverageMap[c.name] = c.present;
      }

      const matchResult = computeKeywordMatchScore(
        Object.keys(metrics.keywordFrequency),
        jdKeywords,
        coverageMap,
        formattingScore.score,
      );

      atsReport = {
        matchScore: matchResult.overallAtsScore,
        resumeKeywords: Object.keys(metrics.keywordFrequency),
        jdKeywords,
        matchedKeywords: matchResult.matchedKeywords,
        missingKeywords: matchResult.missingKeywords,
        partialMatches: matchResult.partialMatches,
        sectionCoverage: coverageMap,
      };
    } catch {
      // Graceful: continue without ATS report
    }
  }

  // Step 5: AI analysis agent
  const { sectionScores, readability } = await runAnalysisAgent(
    document,
    metrics,
    kb,
    sendSSE,
  );

  // Step 6: Persist
  const result: AnalysisResultV2 = {
    deterministicMetrics: metrics,
    sectionMetrics: metrics.perSection,
    sectionScores,
    readability,
    atsReport,
    keywordFrequency: metrics.keywordFrequency,
  };

  try {
    await saveAnalysisResults({
      analysisId: input.analysisId,
      sectionMetrics: metrics.perSection,
      sectionScores,
      atsReport,
      keywordFrequency: metrics.keywordFrequency,
    });
  } catch {
    // Graceful: results still returned to client
  }

  // Step 7: Complete
  sendSSE("complete", result);

  return result;
}

// ── Tailor Pipeline (Phase 3) ────────────────────────────────────

export interface TailorPipelineResult {
  rewrites: Rewrite[];
  stats: {
    rewritten: number;
    reframed: number;
    missing: number;
    total: number;
  };
}

export async function runTailorPipeline(
  input: {
    analysisId: string;
    jobDescription: string;
  },
  sendSSE: PipelineSSESender,
): Promise<TailorPipelineResult> {
  // Step 1: Load document from DB
  const loaded = await loadAnalysisDocument(input.analysisId);
  if (!loaded) {
    throw new Error("Analysis not found");
  }
  const { document } = loaded;

  // Step 2: Load analysis results
  const analysisResult = await loadAnalysisResults(input.analysisId);
  if (!analysisResult) {
    throw new Error("Analysis results not found");
  }

  // Step 3: Re-detect profession + get KB
  const profession = detectProfession(document.sections);
  const kb = getKnowledgeBase(profession.professionId);

  // Step 4: Start tailoring
  sendSSE("tailoring_start", { message: "Analyzing skill gaps..." });

  // Step 5: Run tailor agent
  const rewrites = await runTailorAgent(
    document,
    analysisResult.atsReport,
    analysisResult,
    input.jobDescription,
    kb,
    sendSSE,
  );

  // Step 6: Compute stats
  const stats = {
    rewritten: rewrites.filter((r) => r.gapClassification === "REWRITTEN").length,
    reframed: rewrites.filter((r) => r.gapClassification === "REFRAMED").length,
    missing: rewrites.filter((r) => r.gapClassification === "MISSING").length,
    total: rewrites.length,
  };

  // Step 7: Persist
  try {
    await saveRewrites({ analysisId: input.analysisId, rewrites });
  } catch {
    // Graceful: rewrites still returned to client
  }

  // Step 8: Complete
  sendSSE("tailoring_complete", { rewrites, stats });

  return { rewrites, stats };
}

function computeSectionCoverage(
  sections: DynamicSection[],
  professionId: string,
  levelId: string,
  contact?: ContactInfo,
): ExtractionResult["sectionCoverage"] {
  const kb = getKnowledgeBase(professionId);
  const level = kb.careerLevels.find((l) => l.id === levelId);
  if (!level) {
    return { required: [], recommended: [], optional: [] };
  }

  // Build set of canonical section titles present
  const presentCanonicals = new Set<string>();
  for (const section of sections) {
    presentCanonicals.add(getCoverageCanonical(section.title));
  }

  // Check contact-derived fields
  const hasContact = contact && (
    Boolean(contact.fullName) ||
    Boolean(contact.email) ||
    Boolean(contact.phone)
  );
  const hasLinkedIn = Boolean(contact?.linkedin);
  const hasGitHub = Boolean(contact?.github);

  if (hasContact) presentCanonicals.add("contact");
  if (hasLinkedIn) presentCanonicals.add("linkedin");
  if (hasGitHub) presentCanonicals.add("github");

  const checkPresence = (name: string): boolean =>
    presentCanonicals.has(name);

  return {
    required: level.requiredSections.map((name) => ({
      name,
      present: checkPresence(name),
    })),
    recommended: level.recommendedSections.map((name) => ({
      name,
      present: checkPresence(name),
    })),
    optional: level.optionalSections.map((name) => ({
      name,
      present: checkPresence(name),
    })),
  };
}

/** Canonical names used in KB section coverage checks. */
const COVERAGE_ALIASES: Record<string, string[]> = {
  contact: ["contact", "contact information", "personal information", "personal details"],
  experience: ["experience", "work experience", "professional experience", "work history", "employment"],
  education: ["education", "academic background", "education and training", "academic"],
  skills: ["skills", "technical skills", "core competencies", "competencies", "areas of expertise", "expertise"],
  summary: ["summary", "profile", "professional summary", "about", "objective", "career objective"],
  projects: ["projects", "personal projects", "key projects", "selected projects"],
  certifications: ["certifications", "certificates", "licenses", "professional certifications"],
  open_source: ["open source", "open-source", "open source contributions", "contributions"],
};

function getCoverageCanonical(title: string): string {
  const lower = title.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(COVERAGE_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      return canonical;
    }
  }
  return lower;
}
