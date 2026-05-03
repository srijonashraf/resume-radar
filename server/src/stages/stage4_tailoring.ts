import { randomUUID } from "crypto";
import type {
  ResumeDocument,
  AnalysisResultV2,
  AtsReport,
  Rewrite,
} from "@resumetra/shared";
import type { ProfessionKnowledgeBase } from "../knowledge/types.js";
import type { PipelineSSESender } from "../services/pipelineService.js";
import { callTool } from "../services/aiService.js";
import {
  classifySkillsTool,
  classifySkillsResponseSchema,
  rewriteBulletTool,
  rewriteBulletResponseSchema,
} from "./tailorTools.js";
import { TAILOR_SYSTEM_PROMPT } from "./tailorPrompts.js";

interface SkillClassification {
  skill: string;
  classification: "HAS" | "ADJACENT" | "LACKS";
  evidence: string;
  adjacentSkill?: string;
}

export async function runTailorAgent(
  document: ResumeDocument,
  atsReport: AtsReport | null,
  analysisResult: AnalysisResultV2,
  jdText: string,
  kb: ProfessionKnowledgeBase,
  sendSSE: PipelineSSESender,
): Promise<Rewrite[]> {
  // Collect sections with medium+ severity issues
  const sectionsWithIssues = new Map<
    string,
    { sectionTitle: string; itemIds: Set<string> }
  >();

  for (const score of analysisResult.sectionScores) {
    const mediumPlusIssues = score.issues.filter(
      (i) => i.severity === "high" || i.severity === "medium",
    );
    if (mediumPlusIssues.length === 0) continue;

    const section = document.sections.find((s) => s.id === score.sectionId);
    if (!section) continue;

    const itemIds = new Set(
      mediumPlusIssues
        .map((i) => i.itemId)
        .filter((id): id is string => id !== null),
    );

    sectionsWithIssues.set(score.sectionId, {
      sectionTitle: section.title,
      itemIds,
    });
  }

  if (sectionsWithIssues.size === 0) return [];

  // Build missing keywords set for fabrication check
  const missingKeywords = new Set(
    (atsReport?.missingKeywords ?? []).map((k) => k.toLowerCase()),
  );

  // Build context
  const resumeContext = document.sections
    .map((s) => {
      const lines: string[] = [`## ${s.title} (id: ${s.id})`];
      for (const item of s.items) {
        if (item.heading) lines.push(`### ${item.heading}`);
        if (item.subheading) lines.push(item.subheading);
        if (item.dateRange) lines.push(item.dateRange);
        if (item.description) lines.push(item.description);
        if (item.bullets)
          lines.push(...item.bullets.map((b, i) => `- [${item.id}/bullet-${i}] ${b}`));
        if (item.items)
          lines.push(...item.items.map((t, i) => `- [${item.id}/item-${i}] ${t}`));
        if (item.rawText) lines.push(item.rawText);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const atsContext = atsReport
    ? [
        `## ATS Keyword Analysis`,
        `- Match score: ${atsReport.matchScore}%`,
        `- Matched: ${atsReport.matchedKeywords.join(", ") || "none"}`,
        `- Missing: ${atsReport.missingKeywords.join(", ") || "none"}`,
        `- JD keywords: ${atsReport.jdKeywords.join(", ")}`,
      ].join("\n")
    : "";

  const issuesContext = analysisResult.sectionScores
    .flatMap((s) =>
      s.issues
        .filter((i) => i.severity === "high" || i.severity === "medium")
        .map(
          (i) =>
            `- [${s.sectionId}/${i.itemId ?? "section"}] ${i.severity}: ${i.description} → ${i.suggestion}`,
        ),
    )
    .join("\n");

  const kbLearningContext = Object.entries(kb.learningResources)
    .map(
      ([skill, path]) =>
        `### ${skill}\n- Courses: ${path.courses.join(", ")}\n- Projects: ${path.projects.join(", ")}\n- Timeline: ${path.timeline}\n- Target bullet: ${path.resumeBulletExample}`,
    )
    .join("\n\n");

  const systemPrompt = [
    TAILOR_SYSTEM_PROMPT,
    atsContext,
    issuesContext
      ? `\n## Analysis Issues (medium+ severity)\n${issuesContext}`
      : "",
    kbLearningContext
      ? `\n## KB Learning Resources\n${kbLearningContext}`
      : "",
    `\n## Strong Action Verbs\n${kb.actionVerbs.strong.join(", ")}`,
  ].join("\n\n");

  // Step 1: Classify skills
  const jdKeywords = atsReport?.jdKeywords ?? [];
  let skillClassifications: SkillClassification[] = [];

  try {
    const classifyResult = await callTool(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Classify these JD skills based on the resume:\n\nSkills: ${jdKeywords.join(", ")}\n\nResume:\n${resumeContext}\n\nJob Description:\n${jdText}`,
        },
      ],
      [classifySkillsTool],
      "classify_skills",
      classifySkillsResponseSchema,
    );

    skillClassifications = classifyResult.data.classifications;
  } catch {
    // Classification failed — cannot proceed safely
    return [];
  }

  // Build classification context for rewrites
  const classificationContext = skillClassifications
    .map(
      (c) =>
        `- ${c.skill}: ${c.classification} (${c.evidence})${c.adjacentSkill ? `. Adjacent: ${c.adjacentSkill}` : ""}`,
    )
    .join("\n");

  // Step 2: Rewrite bullets
  const rewrites: Rewrite[] = [];

  for (const [sectionId, { sectionTitle, itemIds }] of sectionsWithIssues) {
    sendSSE("tailoring_section", { sectionId, sectionTitle });

    for (const itemId of itemIds) {
      try {
        const rewriteResult = await callTool(
          [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Skill classifications:\n${classificationContext}\n\nRewrite item ${itemId} in section "${sectionTitle}" to better match the JD. Only use skills the candidate actually has.\n\nJob Description:\n${jdText}`,
            },
          ],
          [rewriteBulletTool],
          "rewrite_bullet",
          rewriteBulletResponseSchema,
        );

        const data = rewriteResult.data;

        // Fabrication check: REWRITTEN + missing keyword → downgrade to REFRAMED
        let classification = data.gapClassification;
        if (classification === "REWRITTEN") {
          const addedMissingKeyword = data.keywordsAdded.some((k) =>
            missingKeywords.has(k.toLowerCase()),
          );
          if (addedMissingKeyword) {
            classification = "REFRAMED";
          }
        }

        const rewrite: Rewrite = {
          id: randomUUID(),
          sectionId: data.sectionId,
          itemId: data.itemId,
          field: data.field,
          before: data.before,
          after: data.after,
          rationale: data.rationale,
          keywordsAdded: data.keywordsAdded,
          gapClassification: classification,
          accepted: null,
        };

        rewrites.push(rewrite);
        sendSSE("tailoring_rewrite", rewrite);
      } catch {
        // Graceful: skip this bullet, continue with others
      }
    }
  }

  return rewrites;
}
