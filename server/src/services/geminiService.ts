import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const cleanJSON = (text: string) => {
  return text.replace(/```json\n?|\n?```/g, "").trim();
};

export const analyzeResume = async (resumeText: string) => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
    You are a professional resume analyzer. Analyze the following resume text.
    1. Score the resume in terms of skills, experience, and formatting (scale of 1-10).
    2. Provide suggestions for improvement.
    3. Return ONLY a JSON object with NO markdown formatting, following this structure:
    {
      "skills": number,
      "experience": number,
      "format": number,
      "suggestions": string[],
      "missingSkills": string[]
    }
    
    Resume text: ${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text));
};

export const generateCareerMap = async (resumeText: string) => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
    Based on the following resume, generate a career map with 3 distinct potential paths.
    For each path, provide a list of roles (nodes) and the skills/steps (edges) required to get there.
    
    Return ONLY a JSON object with this structure:
    {
      "paths": [
        {
          "name": "Path Name (e.g. CTO)",
          "description": "Brief description",
          "steps": [
            { "role": "Current Role", "status": "current" },
            { "role": "Next Step Role", "status": "future", "skills_needed": ["Skill 1", "Skill 2"] },
            { "role": "Goal Role", "status": "goal", "skills_needed": ["Skill 3", "Skill 4"] }
          ]
        }
      ]
    }

    Resume text: ${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text));
};

export const smartRewrite = async (
  originalText: string,
  jobDescription: string
) => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
    Rewrite the following resume bullet point to better match the job description keywords.
    Provide 3 variations: Conservative, Balanced, and Aggressive.
    
    Original: "${originalText}"
    Job Description Snippet: "${jobDescription}"
    
    Return ONLY a JSON object:
    {
      "variations": [
        { "style": "Conservative", "text": "..." },
        { "style": "Balanced", "text": "..." },
        { "style": "Aggressive", "text": "..." }
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text));
};

export const compareWithJobDescription = async (
  resumeText: string,
  jobDescription: string
) => {
  if (!apiKey) throw new Error("Gemini API Key not found");

  const prompt = `
    You are a professional resume analyzer. Compare the following resume with the job description.
    1. Calculate a match percentage (0-100).
    2. Identify missing skills or qualifications.
    3. Provide suggestions for improving the resume to better match the job.
    4. Return ONLY a JSON object with NO markdown formatting, following this structure:
    {
      "matchPercentage": number,
      "missingSkills": string[],
      "suggestions": string[]
    }
    
    Resume text: ${resumeText}
    
    Job Description: ${jobDescription}
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  return JSON.parse(cleanJSON(text));
};
