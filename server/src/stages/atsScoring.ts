import type { DeterministicMetrics, FormattingIssue } from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../knowledge/types.js";

// ── Penalty weights per severity ─────────────────────────────

const SEVERITY_PENALTY: Record<string, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

// ── computeAtsFormattingScore ────────────────────────────────

export function computeAtsFormattingScore(
  metrics: DeterministicMetrics,
  _kb: ProfessionKnowledgeBase,
): { score: number; issues: FormattingIssue[] } {
  const issues = [...metrics.formattingIssues];

  let penalty = 0;
  for (const issue of issues) {
    penalty += SEVERITY_PENALTY[issue.severity] ?? 0;
  }

  return {
    score: Math.max(0, 100 - penalty),
    issues,
  };
}

// ── Trigram utilities ────────────────────────────────────────

function toTrigrams(word: string): Set<string> {
  const lower = word.toLowerCase();
  if (lower.length < 3) return new Set([lower]);
  const trigrams = new Set<string>();
  for (let i = 0; i <= lower.length - 3; i++) {
    trigrams.add(lower.slice(i, i + 3));
  }
  return trigrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const PARTIAL_MATCH_THRESHOLD = 0.8;

// ── computeKeywordMatchScore ─────────────────────────────────

export interface KeywordMatchResult {
  exactMatchScore: number;
  partialMatchScore: number;
  sectionCoverageScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  partialMatches: {
    jdKeyword: string;
    resumeKeyword: string;
    similarity: number;
  }[];
  overallAtsScore: number;
}

export function computeKeywordMatchScore(
  resumeKeywords: string[],
  jdKeywords: string[],
  sectionCoverage: Record<string, boolean>,
  formattingScore: number = 100,
): KeywordMatchResult {
  const normalizedResume = resumeKeywords.map((k) => k.toLowerCase());

  // ── Exact matching ──
  const matchedKeywords: string[] = [];
  const unmatchedJdKeywords: string[] = [];

  for (const jdKw of jdKeywords) {
    const normalizedJd = jdKw.toLowerCase();
    if (normalizedResume.includes(normalizedJd)) {
      matchedKeywords.push(normalizedJd);
    } else {
      unmatchedJdKeywords.push(jdKw);
    }
  }

  const exactMatchScore =
    jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) * 100 : 0;

  // ── Partial matching (trigram similarity) ──
  const partialMatches: KeywordMatchResult["partialMatches"] = [];

  for (const jdKw of unmatchedJdKeywords) {
    const jdTrigrams = toTrigrams(jdKw);
    let bestMatch: { resumeKeyword: string; similarity: number } | null = null;

    for (const resumeKw of normalizedResume) {
      // Skip if already exact matched
      if (matchedKeywords.includes(resumeKw)) continue;
      const resumeTrigrams = toTrigrams(resumeKw);
      const similarity = jaccardSimilarity(jdTrigrams, resumeTrigrams);
      if (
        similarity >= PARTIAL_MATCH_THRESHOLD &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = { resumeKeyword: resumeKw, similarity };
      }
    }

    if (bestMatch) {
      partialMatches.push({
        jdKeyword: jdKw.toLowerCase(),
        resumeKeyword: bestMatch.resumeKeyword,
        similarity: bestMatch.similarity,
      });
    }
  }

  const partialMatchScore =
    jdKeywords.length > 0 ? (partialMatches.length / jdKeywords.length) * 100 : 0;

  // ── Section coverage ──
  const coverageEntries = Object.values(sectionCoverage);
  const sectionCoverageScore =
    coverageEntries.length > 0
      ? (coverageEntries.filter(Boolean).length / coverageEntries.length) * 100
      : 100;

  // ── Missing keywords ──
  const partialMatchedJdKeywords = new Set(
    partialMatches.map((pm) => pm.jdKeyword),
  );
  const missingKeywords = unmatchedJdKeywords.filter(
    (kw) => !partialMatchedJdKeywords.has(kw.toLowerCase()),
  );

  // ── Overall ATS score ──
  const overallAtsScore =
    exactMatchScore * 0.5 +
    partialMatchScore * 0.2 +
    sectionCoverageScore * 0.2 +
    formattingScore * 0.1;

  return {
    exactMatchScore,
    partialMatchScore,
    sectionCoverageScore,
    matchedKeywords,
    missingKeywords,
    partialMatches,
    overallAtsScore,
  };
}
