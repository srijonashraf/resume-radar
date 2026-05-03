import { z } from "zod";
import type { ToolDefinition } from "../services/aiService.js";

// ── Tool 1: classify_skills ─────────────────────────────────────

const skillClassificationSchema = z.enum(["HAS", "ADJACENT", "LACKS"]);

const skillClassificationEntrySchema = z.object({
  skill: z.string().min(1),
  classification: skillClassificationSchema,
  evidence: z.string().min(1),
  adjacentSkill: z.string().min(1).optional(),
});

export const classifySkillsResponseSchema = z.object({
  classifications: z.array(skillClassificationEntrySchema).min(1),
});

export const classifySkillsTool: ToolDefinition = {
  type: "function",
  function: {
    name: "classify_skills",
    description:
      "Classify each JD skill based on the candidate's resume. Use HAS when the candidate clearly has the skill, ADJACENT when they have related experience, and LACKS when they genuinely lack the skill.",
    parameters: {
      type: "object",
      properties: {
        classifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skill: {
                type: "string",
                description: "The JD skill being classified",
              },
              classification: {
                type: "string",
                enum: ["HAS", "ADJACENT", "LACKS"],
                description:
                  "HAS = candidate has this skill, ADJACENT = related experience exists, LACKS = genuinely missing",
              },
              evidence: {
                type: "string",
                description:
                  "Specific evidence from the resume supporting this classification",
              },
              adjacentSkill: {
                type: "string",
                description:
                  "The adjacent skill the candidate has (required when classification is ADJACENT)",
              },
            },
            required: ["skill", "classification", "evidence"],
          },
          description: "Classification for each JD skill",
        },
      },
      required: ["classifications"],
    },
  },
};

// ── Tool 2: rewrite_bullet ──────────────────────────────────────

const gapClassificationSchema = z.enum(["REWRITTEN", "REFRAMED", "MISSING"]);

const learningPathSchema = z.object({
  courses: z.array(z.string()),
  projects: z.array(z.string()),
  timeline: z.string().min(1),
  targetBullet: z.string().min(1),
});

export const rewriteBulletResponseSchema = z.object({
  sectionId: z.string().min(1),
  itemId: z.string().min(1),
  field: z.string().min(1),
  before: z.string(),
  after: z.string(),
  rationale: z.string().min(1),
  keywordsAdded: z.array(z.string()),
  gapClassification: gapClassificationSchema,
  learningPath: learningPathSchema.optional(),
});

export const rewriteBulletTool: ToolDefinition = {
  type: "function",
  function: {
    name: "rewrite_bullet",
    description:
      "Rewrite a single resume bullet with honest gap classification. REWRITTEN = user has skill, needs better framing. REFRAMED = lacks exact skill but has adjacent experience. MISSING = genuinely lacks skill, provide learning path.",
    parameters: {
      type: "object",
      properties: {
        sectionId: {
          type: "string",
          description: "The section containing this bullet",
        },
        itemId: {
          type: "string",
          description: "The specific item being rewritten",
        },
        field: {
          type: "string",
          description: "Which field is being rewritten (e.g., bullet, heading, description)",
        },
        before: {
          type: "string",
          description: "Original text before rewrite",
        },
        after: {
          type: "string",
          description:
            "Rewritten text. For MISSING, this is aspirational — what the bullet COULD look like after learning.",
        },
        rationale: {
          type: "string",
          description: "Why this rewrite improves the bullet",
        },
        keywordsAdded: {
          type: "array",
          items: { type: "string" },
          description:
            "JD keywords incorporated. Must trace to existing resume experience — never fabricated.",
        },
        gapClassification: {
          type: "string",
          enum: ["REWRITTEN", "REFRAMED", "MISSING"],
          description:
            "REWRITTEN = user has skill, bullet needs better framing. REFRAMED = lacks exact skill but has adjacent experience. MISSING = genuinely lacks skill.",
        },
        learningPath: {
          type: "object",
          properties: {
            courses: {
              type: "array",
              items: { type: "string" },
              description: "Recommended courses or learning resources",
            },
            projects: {
              type: "array",
              items: { type: "string" },
              description: "Suggested practice projects",
            },
            timeline: {
              type: "string",
              description: "Estimated time to gain this skill",
            },
            targetBullet: {
              type: "string",
              description:
                "What the bullet could look like after completing the learning path",
            },
          },
          required: ["courses", "projects", "timeline", "targetBullet"],
          description:
            "Learning path for MISSING skills. Required when gapClassification is MISSING.",
        },
      },
      required: [
        "sectionId",
        "itemId",
        "field",
        "before",
        "after",
        "rationale",
        "keywordsAdded",
        "gapClassification",
      ],
    },
  },
};

// ── Export all ───────────────────────────────────────────────────

export const allTailorTools: ToolDefinition[] = [
  classifySkillsTool,
  rewriteBulletTool,
];
