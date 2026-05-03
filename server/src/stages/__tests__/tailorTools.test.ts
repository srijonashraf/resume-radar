import { describe, it, expect } from "vitest";
import {
  classifySkillsTool,
  classifySkillsResponseSchema,
  rewriteBulletTool,
  rewriteBulletResponseSchema,
  allTailorTools,
} from "../tailorTools.js";
import { TAILOR_SYSTEM_PROMPT } from "../tailorPrompts.js";

// ── classify_skills ─────────────────────────────────────────────

describe("classify_skills tool", () => {
  it("has correct tool definition shape", () => {
    expect(classifySkillsTool.type).toBe("function");
    expect(classifySkillsTool.function.name).toBe("classify_skills");
    expect(classifySkillsTool.function.parameters).toBeDefined();
  });

  it("validates a complete response with all classification types", () => {
    const response = {
      classifications: [
        {
          skill: "Python",
          classification: "HAS",
          evidence: "Listed under technical skills",
        },
        {
          skill: "Kubernetes",
          classification: "ADJACENT",
          evidence: "Docker experience demonstrates containerization knowledge",
          adjacentSkill: "Docker",
        },
        {
          skill: "Rust",
          classification: "LACKS",
          evidence: "No mention of Rust or systems programming",
        },
      ],
    };
    expect(
      classifySkillsResponseSchema.safeParse(response).success,
    ).toBe(true);
  });

  it("validates a minimal response", () => {
    const response = {
      classifications: [
        {
          skill: "React",
          classification: "HAS",
          evidence: "Used in 3 projects",
        },
      ],
    };
    expect(
      classifySkillsResponseSchema.safeParse(response).success,
    ).toBe(true);
  });

  it("rejects invalid classification values", () => {
    const response = {
      classifications: [
        {
          skill: "Python",
          classification: "MAYBE",
          evidence: "Unclear",
        },
      ],
    };
    expect(
      classifySkillsResponseSchema.safeParse(response).success,
    ).toBe(false);
  });

  it("rejects missing evidence", () => {
    const response = {
      classifications: [
        {
          skill: "Python",
          classification: "HAS",
        },
      ],
    };
    expect(
      classifySkillsResponseSchema.safeParse(response).success,
    ).toBe(false);
  });

  it("rejects empty classifications array", () => {
    const response = { classifications: [] };
    expect(
      classifySkillsResponseSchema.safeParse(response).success,
    ).toBe(false);
  });
});

// ── rewrite_bullet ───────────────────────────────────────────────

describe("rewrite_bullet tool", () => {
  const baseRewrite = {
    sectionId: "section-0",
    itemId: "item-0-1",
    field: "bullet",
    before: "Helped with the project",
    after: "Spearheaded the project delivery",
    rationale: "Stronger action verb for impact",
    keywordsAdded: ["leadership"],
    gapClassification: "REWRITTEN" as const,
  };

  it("has correct tool definition shape", () => {
    expect(rewriteBulletTool.type).toBe("function");
    expect(rewriteBulletTool.function.name).toBe("rewrite_bullet");
    expect(rewriteBulletTool.function.parameters).toBeDefined();
  });

  it("validates a REWRITTEN response", () => {
    expect(
      rewriteBulletResponseSchema.safeParse(baseRewrite).success,
    ).toBe(true);
  });

  it("validates a REFRAMED response", () => {
    const response = {
      ...baseRewrite,
      gapClassification: "REFRAMED",
      rationale: "User lacks Kubernetes but has Docker experience",
      keywordsAdded: ["containerization"],
    };
    expect(
      rewriteBulletResponseSchema.safeParse(response).success,
    ).toBe(true);
  });

  it("validates a MISSING response with learningPath", () => {
    const response = {
      ...baseRewrite,
      gapClassification: "MISSING",
      rationale: "User has no Rust experience",
      keywordsAdded: [],
      after: "Aspirational bullet showing Rust contribution",
      learningPath: {
        courses: ["Rust Programming Course"],
        projects: ["Build a CLI tool in Rust"],
        timeline: "2-3 months",
        targetBullet: "Developed high-performance CLI tool using Rust",
      },
    };
    expect(
      rewriteBulletResponseSchema.safeParse(response).success,
    ).toBe(true);
  });

  it("validates REWRITTEN without learningPath (optional)", () => {
    const { learningPath: _, ...withoutPath } = baseRewrite as any;
    expect(
      rewriteBulletResponseSchema.safeParse(withoutPath).success,
    ).toBe(true);
  });

  it("rejects invalid gapClassification", () => {
    const response = {
      ...baseRewrite,
      gapClassification: "FABRICATED",
    };
    expect(
      rewriteBulletResponseSchema.safeParse(response).success,
    ).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(
      rewriteBulletResponseSchema.safeParse({
        sectionId: "section-0",
        after: "Something",
      }).success,
    ).toBe(false);
  });

  it("rejects learningPath with missing fields", () => {
    const response = {
      ...baseRewrite,
      gapClassification: "MISSING",
      learningPath: {
        courses: ["Course 1"],
        // missing projects, timeline, targetBullet
      },
    };
    expect(
      rewriteBulletResponseSchema.safeParse(response).success,
    ).toBe(false);
  });
});

// ── allTailorTools export ────────────────────────────────────────

describe("allTailorTools export", () => {
  it("contains both tailor tools", () => {
    expect(allTailorTools).toHaveLength(2);
    const names = allTailorTools.map((t) => t.function.name);
    expect(names).toContain("classify_skills");
    expect(names).toContain("rewrite_bullet");
  });
});

// ── Tailor system prompt ─────────────────────────────────────────

describe("TAILOR_SYSTEM_PROMPT", () => {
  const rules = [
    "NEVER fabricate skills",
    "Classify skills first",
    "REWRITTEN",
    "REFRAMED",
    "MISSING",
    "aspirational",
    "implicit skills",
    "keywordsAdded",
  ];

  it("contains all 8 fabrication-prevention rules", () => {
    for (const rule of rules) {
      expect(
        TAILOR_SYSTEM_PROMPT,
        `Missing rule: "${rule}"`,
      ).toContain(rule);
    }
  });

  it("is a non-empty string", () => {
    expect(TAILOR_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });
});
