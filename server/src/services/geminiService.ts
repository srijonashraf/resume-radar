import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ==================== TYPE DEFINITIONS ====================

export interface ResumeAnalysisError {
  error: "NOT_A_RESUME";
  message: string;
  detectedType?: string;
}

export interface ResumeAnalysisSuccess {
  overallScore: number;
  scores: {
    technicalSkills: number;
    experience: number;
    presentation: number;
    education: number;
    leadership: number;
  };
  experienceLevel:
    | "Entry-Level"
    | "Junior"
    | "Mid-Level"
    | "Senior"
    | "Lead/Principal"
    | "Executive";
  yearsOfExperience: number;
  strengthAreas: string[];
  improvementAreas: string[];
  missingSkills: string[];
  redFlags: string[];
  detectedSkills: {
    technical: string[];
    soft: string[];
  };
  keyAchievements: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  atsCompatibility: {
    score: number;
    issues: string[];
  };
  hiringRecommendation:
    | "Strong Hire"
    | "Hire"
    | "Maybe"
    | "No Hire"
    | "Needs More Info";
  summary: string;
}

export type ResumeAnalysisResult = ResumeAnalysisError | ResumeAnalysisSuccess;

export interface CareerPathStep {
  role: string;
  status: "current" | "future" | "goal";
  skills_needed?: string[];
  timeframe?: string;
  salary_range?: string;
}

export interface CareerPath {
  name: string;
  description: string;
  difficulty: "Low" | "Medium" | "High";
  timeToGoal: string;
  steps: CareerPathStep[];
}

export interface CareerMapResult {
  paths: CareerPath[];
  currentRole: string;
  currentSkills: string[];
  recommendations: string[];
}

export interface RewriteVariation {
  style: "Conservative" | "Balanced" | "Aggressive";
  text: string;
  changes: string[];
  impact: "Low" | "Medium" | "High";
}

export interface SmartRewriteResult {
  original: string;
  variations: RewriteVariation[];
  keywords_matched: string[];
  ats_score: {
    conservative: number;
    balanced: number;
    aggressive: number;
  };
  recommendation: string;
}

export interface JobComparisonResult {
  matchPercentage: number;
  matchLevel: "Poor" | "Fair" | "Good" | "Excellent";
  missingSkills: {
    critical: string[];
    important: string[];
    nice_to_have: string[];
  };
  presentSkills: {
    exact_matches: string[];
    partial_matches: string[];
    transferable_skills: string[];
  };
  suggestions: {
    priority: "High" | "Medium" | "Low";
    category: string;
    action: string;
  }[];
  keyword_analysis: {
    total_keywords: number;
    matched_keywords: number;
    missing_keywords: string[];
  };
  experience_gap: {
    required_years: number;
    candidate_years: number;
    gap: number;
    assessment: string;
  };
  recommendation: string;
}

// ==================== UTILITY FUNCTIONS ====================

const cleanJSON = (text: string): string => {
  return text.replace(/```json\n?|\n?```/g, "").trim();
};

// ==================== MAIN FUNCTIONS ====================

export const analyzeResume = async (
  resumeText: string
): Promise<ResumeAnalysisResult> => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const currentDate = new Date().toISOString().split("T")[0];

  const prompt = `
IMPORTANT CONTEXT: Today's date is ${currentDate}. Use this date when calculating experience durations for positions marked as "Present", "Current", or "Ongoing".

You are a Senior Technical Screener with 15+ years of experience in talent acquisition and technical recruitment across FAANG and Fortune 500 companies. Your role is to conduct thorough, unbiased resume assessments with industry-standard rigor.

PHASE 1 - DOCUMENT VALIDATION:
First, verify if this is a legitimate professional resume/CV. A valid resume must contain at least 3 of these elements:
- Professional work experience with job titles and dates
- Educational background or certifications
- Technical or professional skills
- Contact information or professional summary

If the document is NOT a resume (e.g., book, article, blog post, marketing copy, random text), return:
{
  "error": "NOT_A_RESUME",
  "message": "This document doesn't appear to be a professional resume. Please upload a valid resume containing your work experience, education, and skills.",
  "detectedType": "brief description of what the document appears to be"
}

PHASE 2 - COMPREHENSIVE TECHNICAL ASSESSMENT:
If it IS a valid resume, conduct a multi-dimensional analysis:

SCORING CRITERIA (1-10 scale):

1. TECHNICAL SKILLS (1-10):
   - Depth: Variety and relevance of technical skills
   - Currency: Modern vs. outdated technologies
   - Specificity: Concrete tools/frameworks vs. vague buzzwords
   - Proficiency indicators: Years of experience, certifications, projects
   
2. PROFESSIONAL EXPERIENCE (1-10):
   - Relevance: Alignment with senior/mid-level roles
   - Progression: Career growth and increasing responsibility
   - Impact: Quantifiable achievements (metrics, scale, outcomes)
   - Recency: Current employment gaps, continuous work history
   - Quality: Company reputation, role complexity
   
3. PRESENTATION & FORMAT (1-10):
   - Structure: Logical flow, clear sections, proper hierarchy
   - Clarity: Concise language, action verbs, quantified results
   - Completeness: No critical gaps (dates, job titles, education)
   - Professionalism: Grammar, formatting consistency, length (1-2 pages ideal)
   - ATS-compatibility: Proper formatting for applicant tracking systems

4. EDUCATION & CERTIFICATIONS (1-10):
   - Formal education: Degree relevance and institution quality
   - Certifications: Industry-recognized credentials (AWS, Azure, Google Cloud, PMP, etc.)
   - Continuous learning: Recent courses, bootcamps, professional development
   - Academic achievements: GPA (if notable), honors, relevant coursework

5. LEADERSHIP & SOFT SKILLS (1-10):
   - Team leadership: Management experience, team size, mentorship
   - Communication: Evidence of cross-functional collaboration, presentations, documentation
   - Problem-solving: Complex challenges solved, innovative solutions
   - Business acumen: Understanding of business impact, stakeholder management

Return a JSON object with this EXACT structure:
{
  "overallScore": number (1-10, weighted average),
  "scores": {
    "technicalSkills": number (1-10),
    "experience": number (1-10),
    "presentation": number (1-10),
    "education": number (1-10),
    "leadership": number (1-10)
  },
  "experienceLevel": "Entry-Level" | "Junior" | "Mid-Level" | "Senior" | "Lead/Principal" | "Executive",
  "yearsOfExperience": number (SUM of all work experience durations - for positions ending in "Present"/"Current", calculate duration from start date to today's date: ${currentDate}),
  "strengthAreas": string[] (top 3-5 strengths with specific examples),
  "improvementAreas": string[] (top 3-5 areas needing improvement with actionable advice),
  "missingSkills": string[] (skills commonly expected for this experience level but absent),
  "redFlags": string[] (employment gaps, lack of progression, outdated skills, etc.),
  "detectedSkills": {
    "technical": string[] (programming languages, frameworks, tools),
    "soft": string[] (leadership, communication, etc.)
  },
  "keyAchievements": string[] (top quantifiable accomplishments found),
  "recommendations": {
    "immediate": string[] (quick wins, 2-3 actionable fixes),
    "shortTerm": string[] (improvements for next revision),
    "longTerm": string[] (career development suggestions)
  },
  "atsCompatibility": {
    "score": number (1-100),
    "issues": string[] (formatting problems for ATS systems)
  },
  "hiringRecommendation": "Strong Hire" | "Hire" | "Maybe" | "No Hire" | "Needs More Info",
  "summary": string (2-3 sentence executive summary of the candidate)
}

EVALUATION GUIDELINES:
- Be objective and constructive, not harsh or discouraging
- Provide specific, actionable feedback with examples from the resume
- Consider industry standards and role requirements
- Flag both positive differentiators and concerning gaps
- Use evidence-based reasoning for all assessments
- Recognize diverse career paths (career changes, non-traditional backgrounds)
- Account for different resume formats (chronological, functional, combination)

IMPORTANT: Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO additional text.

Resume text to analyze:
${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text)) as ResumeAnalysisResult;
};

export const generateCareerMap = async (
  resumeText: string
): Promise<CareerMapResult> => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
You are a Senior Career Development Advisor with expertise in technology career progression, industry trends, and talent development across diverse tech roles.

OBJECTIVE:
Analyze the provided resume and generate 3 strategic career paths tailored to the candidate's background, skills, and market opportunities.

ANALYSIS REQUIREMENTS:

1. Current State Assessment:
   - Identify current role and seniority level
   - Extract core technical and soft skills
   - Determine years of experience and specializations
   - Note industry focus and domain expertise

2. Career Path Generation:
   Create 3 DISTINCT paths with different trajectories:
   - Path 1: SPECIALIST TRACK (Deep technical expertise)
   - Path 2: LEADERSHIP TRACK (Management and strategy)
   - Path 3: HYBRID/LATERAL TRACK (Emerging tech or cross-functional)

3. For Each Path Include:
   - Realistic progression timeline (2-7 years to goal)
   - 3-5 milestone roles from current to goal position
   - Specific skills/certifications needed at each step
   - Difficulty assessment (Low/Medium/High)
   - Market demand and salary trajectory insights

Return ONLY valid JSON with this EXACT structure:
{
  "paths": [
    {
      "name": "Path Title (e.g., 'Principal Engineer Track')",
      "description": "2-3 sentence overview of this career trajectory",
      "difficulty": "Low" | "Medium" | "High",
      "timeToGoal": "e.g., '4-6 years'",
      "steps": [
        {
          "role": "Current Role Title",
          "status": "current",
          "timeframe": "Present"
        },
        {
          "role": "Next Step Role Title",
          "status": "future",
          "skills_needed": ["Skill 1", "Skill 2", "Skill 3"],
          "timeframe": "1-2 years",
          "salary_range": "e.g., '$120K-$160K'"
        },
        {
          "role": "Goal Role Title",
          "status": "goal",
          "skills_needed": ["Advanced Skill 1", "Advanced Skill 2"],
          "timeframe": "4-6 years",
          "salary_range": "e.g., '$180K-$250K'"
        }
      ]
    }
  ],
  "currentRole": "Identified current role",
  "currentSkills": ["Key Skill 1", "Key Skill 2", "Key Skill 3"],
  "recommendations": [
    "Strategic recommendation 1",
    "Strategic recommendation 2",
    "Strategic recommendation 3"
  ]
}

GUIDELINES:
- Base paths on realistic market opportunities and current trends
- Consider the candidate's existing strengths and natural progressions
- Ensure skills_needed are specific and actionable (certifications, technologies, competencies)
- Provide diverse options (technical depth vs. management vs. emerging fields)
- Include salary ranges based on current market data (US averages)
- Make timeframes realistic based on typical career progression

IMPORTANT: Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO additional text.

Resume text:
${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text)) as CareerMapResult;
};

export const smartRewrite = async (
  originalText: string,
  jobDescription: string
): Promise<SmartRewriteResult> => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
You are an Expert ATS (Applicant Tracking System) Optimization Specialist and Resume Writer with deep knowledge of keyword optimization, industry-specific terminology, and hiring manager preferences.

OBJECTIVE:
Rewrite the provided resume bullet point to maximize ATS compatibility and human appeal while maintaining authenticity and truthfulness.

ANALYSIS PROCESS:

1. Extract Key Information:
   - Identify action verbs, metrics, and achievements in original text
   - Extract relevant keywords from job description
   - Note technical skills, tools, and methodologies mentioned
   - Identify power words and industry-specific terminology

2. Generate 3 Strategic Variations:

   A. CONSERVATIVE (Authenticity-First):
      - Minor keyword integration without changing core meaning
      - Preserve original structure and voice
      - Add 2-3 job-relevant terms naturally
      - Best for: Honest representation, minimal embellishment
      
   B. BALANCED (Optimization-Focused):
      - Strategic keyword placement for ATS optimization
      - Enhance impact with stronger action verbs and metrics
      - Restructure for clarity and keyword density
      - Best for: Competitive job applications, ATS-heavy companies
      
   C. AGGRESSIVE (Maximum Impact):
      - Heavy keyword optimization and power language
      - Amplify achievements with stronger framing
      - Maximum ATS scoring potential
      - Best for: Highly competitive roles, career pivots
      - IMPORTANT: Must remain truthful - enhance framing, not fabricate

3. Scoring & Analysis:
   - Calculate ATS compatibility score (1-100) for each variation
   - Identify which job description keywords were successfully integrated
   - Highlight specific changes made in each version
   - Assess impact potential for each variation

Return ONLY valid JSON with this EXACT structure:
{
  "original": "${originalText}",
  "variations": [
    {
      "style": "Conservative",
      "text": "Rewritten bullet point",
      "changes": ["Change 1", "Change 2", "Change 3"],
      "impact": "Low" | "Medium" | "High"
    },
    {
      "style": "Balanced",
      "text": "Rewritten bullet point",
      "changes": ["Change 1", "Change 2", "Change 3"],
      "impact": "Low" | "Medium" | "High"
    },
    {
      "style": "Aggressive",
      "text": "Rewritten bullet point",
      "changes": ["Change 1", "Change 2", "Change 3"],
      "impact": "Low" | "Medium" | "High"
    }
  ],
  "keywords_matched": ["keyword1", "keyword2", "keyword3"],
  "ats_score": {
    "conservative": number (1-100),
    "balanced": number (1-100),
    "aggressive": number (1-100)
  },
  "recommendation": "Which variation to use and why (2-3 sentences)"
}

REWRITING BEST PRACTICES:
- Use strong action verbs (Led, Architected, Optimized, Drove, Implemented)
- Include quantifiable metrics when possible (%, $, time saved, scale)
- Incorporate job description keywords naturally
- Maintain XYZ format: "Accomplished [X] by doing [Y], resulting in [Z]"
- Never fabricate experience - only reframe and optimize existing content
- Ensure variations remain truthful and defensible in interviews

IMPORTANT: Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO additional text.

Original Text: "${originalText}"

Job Description: "${jobDescription}"
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text)) as SmartRewriteResult;
};

export const compareWithJobDescription = async (
  resumeText: string,
  jobDescription: string
): Promise<JobComparisonResult> => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const currentDate = new Date().toISOString().split("T")[0];

  const prompt = `
IMPORTANT CONTEXT: Today's date is ${currentDate}. Use this date when calculating candidate's experience duration for positions marked as "Present", "Current", or "Ongoing".

You are a Senior Technical Recruiter and ATS Specialist with expertise in candidate-job matching, skill gap analysis, and resume optimization for technical roles.

OBJECTIVE:
Conduct a comprehensive comparison between the candidate's resume and the target job description to determine fit, identify gaps, and provide strategic optimization recommendations.

ANALYSIS FRAMEWORK:

1. MATCH PERCENTAGE CALCULATION (0-100):
   Based on weighted factors:
   - Technical Skills Match (35%): Required vs. present technologies, tools, frameworks
   - Experience Level Match (25%): Years and seniority alignment
   - Domain/Industry Match (15%): Relevant sector experience
   - Education/Certifications (10%): Degree and credentials alignment
   - Soft Skills/Culture Fit (10%): Leadership, communication, collaboration evidence
   - Keywords Density (5%): Job description terminology coverage

2. SKILLS CATEGORIZATION:
   Identify and classify missing skills by priority:
   - CRITICAL: Must-have requirements explicitly stated (dealbreakers)
   - IMPORTANT: Strongly preferred qualifications that boost candidacy
   - NICE-TO-HAVE: Additional skills that provide competitive edge

3. PRESENT SKILLS ANALYSIS:
   Categorize candidate's existing relevant skills:
   - EXACT MATCHES: Skills directly matching job requirements
   - PARTIAL MATCHES: Related/adjacent skills that partially satisfy requirements
   - TRANSFERABLE SKILLS: Experience applicable to job needs in different context

4. KEYWORD ANALYSIS:
   - Extract key technical and domain-specific terms from job description
   - Calculate keyword coverage percentage
   - Identify high-value missing keywords for ATS optimization

5. EXPERIENCE GAP ASSESSMENT:
   - Compare required years vs. candidate's experience
   - Assess if gap is bridgeable through skills/achievements
   - Provide contextual evaluation

6. STRATEGIC RECOMMENDATIONS:
   Generate prioritized, actionable suggestions:
   - HIGH PRIORITY: Critical changes that significantly improve match
   - MEDIUM PRIORITY: Important optimizations for competitive edge
   - LOW PRIORITY: Nice-to-have improvements

Return ONLY valid JSON with this EXACT structure:
{
  "matchPercentage": number (0-100),
  "matchLevel": "Poor" | "Fair" | "Good" | "Excellent",
  "missingSkills": {
    "critical": ["Critical Missing Skill 1", "Critical Missing Skill 2"],
    "important": ["Important Missing Skill 1", "Important Missing Skill 2"],
    "nice_to_have": ["Nice-to-have Skill 1", "Nice-to-have Skill 2"]
  },
  "presentSkills": {
    "exact_matches": ["Exact Skill 1", "Exact Skill 2"],
    "partial_matches": ["Partial Skill 1 (description of relevance)", "Partial Skill 2"],
    "transferable_skills": ["Transferable Skill 1", "Transferable Skill 2"]
  },
  "suggestions": [
    {
      "priority": "High",
      "category": "Technical Skills",
      "action": "Specific actionable recommendation"
    },
    {
      "priority": "Medium",
      "category": "Experience Framing",
      "action": "Specific actionable recommendation"
    }
  ],
  "keyword_analysis": {
    "total_keywords": number,
    "matched_keywords": number,
    "missing_keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "experience_gap": {
    "required_years": number,
    "candidate_years": number,
    "gap": number (positive if candidate has more, negative if less),
    "assessment": "Brief assessment of whether gap is concerning or acceptable"
  },
  "recommendation": "Overall strategic recommendation: Should candidate apply? What's the likelihood of success? What should they prioritize? (3-4 sentences)"
}

EVALUATION GUIDELINES:
- Match percentage ranges: 0-40% (Poor), 41-65% (Fair), 66-85% (Good), 86-100% (Excellent)
- Be realistic but encouraging - identify paths to improve fit
- Prioritize suggestions by impact on application success
- Consider both ATS optimization and human reviewer appeal
- Recognize transferable skills and non-traditional backgrounds
- Provide specific, actionable recommendations with clear implementation steps

IMPORTANT: Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO additional text.

Resume Text:
${resumeText}

Job Description:
${jobDescription}
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text)) as JobComparisonResult;
};
