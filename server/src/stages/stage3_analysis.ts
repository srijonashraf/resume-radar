import type {
  ResumeDocument,
  SectionScore,
  SectionIssue,
  ReadabilityAssessment,
} from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../knowledge/types.js";
import type { PipelineSSESender } from "../services/pipelineService.js";
import { callTool } from "../services/aiService.js";
import type { MetricsOutput } from "./stage2_metrics.js";
import {
  scoreSectionTool,
  flagIssueTool,
  assessReadabilityTool,
  scoreSectionResponseSchema,
  flagIssueResponseSchema,
  assessReadabilityResponseSchema,
} from "./analysisTools.js";
import { ANALYSIS_SYSTEM_PROMPT } from "./analysisPrompts.js";

// Threshold below which we flag issues for a section
const FLAG_THRESHOLD = 5;

export async function runAnalysisAgent(
  document: ResumeDocument,
  metrics: MetricsOutput,
  kb: ProfessionKnowledgeBase,
  sendSSE: PipelineSSESender,
): Promise<{ sectionScores: SectionScore[]; readability: ReadabilityAssessment }> {
  const sectionScores: SectionScore[] = [];

  const metricsContext = [
    `## Deterministic Metrics (ground truth — do NOT recompute)`,
    `- Word count: ${metrics.wordCount}`,
    `- Bullet count: ${metrics.bulletCount}`,
    `- Avg bullet word count: ${metrics.avgBulletWordCount}`,
    `- Bullets with action verb: ${metrics.bulletsWithActionVerb}`,
    `- Bullets with metric: ${metrics.bulletsWithMetric}`,
    `- Sections present: ${metrics.sectionsPresent.join(", ") || "none"}`,
    `- Sections missing: ${metrics.sectionsMissing.join(", ") || "none"}`,
    `- Formatting issues: ${metrics.formattingIssues.length}`,
    `- Career level: ${metrics.careerLevelDetected}`,
    `- Total experience: ${metrics.totalExperienceMonths} months`,
    metrics.formattingIssues.length > 0
      ? `- Formatting details: ${metrics.formattingIssues.map((f) => `${f.type} (${f.severity})`).join(", ")}`
      : "",
  ].join("\n");

  // Score each section
  for (const section of document.sections) {
    sendSSE("analyzing", {
      sectionId: section.id,
      sectionTitle: section.title,
    });

    const sectionContext = buildSectionContext(section, metrics);

    try {
      const scoreResult = await callTool(
        [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT + "\n\n" + metricsContext },
          { role: "user", content: sectionContext },
        ],
        [scoreSectionTool],
        "score_section",
        scoreSectionResponseSchema,
      );

      const { contentScore, impactScore } = scoreResult.data;
      const issues: SectionIssue[] = [];

      // Flag issues for low-scoring sections
      if (contentScore < FLAG_THRESHOLD || impactScore < FLAG_THRESHOLD) {
        try {
          const flagResult = await callTool(
            [
              { role: "system", content: ANALYSIS_SYSTEM_PROMPT + "\n\n" + metricsContext },
              { role: "user", content: sectionContext + `\n\nCurrent scores: content=${contentScore}, impact=${impactScore}` },
            ],
            [flagIssueTool],
            "flag_issue",
            flagIssueResponseSchema,
          );

          issues.push({
            itemId: flagResult.data.itemId,
            type: flagResult.data.type,
            severity: flagResult.data.severity,
            description: flagResult.data.description,
            suggestion: flagResult.data.suggestion,
          });
        } catch {
          // Graceful: skip issue flagging on failure
        }
      }

      sectionScores.push({
        sectionId: section.id,
        contentScore,
        impactScore,
        issues,
      });
    } catch {
      // Graceful: skip section on failure
    }
  }

  // Assess readability
  const fullDocContext = document.sections
    .map((s) => `## ${s.title}\n${serializeSectionText(s)}`)
    .join("\n\n");

  const readability: ReadabilityAssessment = { score: 0, issues: [] };

  try {
    const readabilityResult = await callTool(
      [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT + "\n\n" + metricsContext },
        { role: "user", content: `Assess readability for the entire resume:\n\n${fullDocContext}` },
      ],
      [assessReadabilityTool],
      "assess_readability",
      assessReadabilityResponseSchema,
    );

    readability.score = readabilityResult.data.score;
    readability.issues = readabilityResult.data.issues.map((issue) => ({
      itemId: issue.itemId,
      type: issue.type,
      severity: issue.severity,
      description: issue.description,
      suggestion: issue.suggestion,
    }));
  } catch {
    // Graceful: keep default score 0
  }

  return { sectionScores, readability };
}

function buildSectionContext(
  section: ResumeDocument["sections"][number],
  metrics: MetricsOutput,
): string {
  const sectionMetric = metrics.perSection.find(
    (m) => m.sectionId === section.id,
  );
  const metricLine = sectionMetric
    ? `\nSection metrics: ${sectionMetric.wordCount} words, ${sectionMetric.bulletCount} bullets, ${sectionMetric.bulletsWithActionVerb} with action verbs, ${sectionMetric.bulletsWithMetric} with metrics`
    : "";

  return `## Section: ${section.title} (id: ${section.id}, type: ${section.type})${metricLine}\n\n${serializeSectionText(section)}`;
}

function serializeSectionText(
  section: ResumeDocument["sections"][number],
): string {
  const lines: string[] = [];
  for (const item of section.items) {
    if (item.heading) lines.push(item.heading);
    if (item.subheading) lines.push(item.subheading);
    if (item.dateRange) lines.push(item.dateRange);
    if (item.description) lines.push(item.description);
    if (item.bullets) lines.push(...item.bullets.map((b) => `- ${b}`));
    if (item.items) lines.push(...item.items);
    if (item.rawText) lines.push(item.rawText);
  }
  return lines.join("\n");
}
