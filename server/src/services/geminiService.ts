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
    You are a professional resume analyzer. First, determine if the provided text is actually a resume/CV.
    
    IMPORTANT: If the text is NOT a resume (e.g., it's a book, article, random document, or has no professional information), 
    return this exact structure:
    {
      "error": "NOT_A_RESUME",
      "message": "This document doesn't appear to be a resume. Please upload a valid resume containing your work experience, education, and skills."
    }
    
    If it IS a valid resume, analyze it and return:
    {
      "skills": number (1-10),
      "experience": number (1-10),
      "format": number (1-10),
      "suggestions": string[],
      "missingSkills": string[]
    }
    
    Return ONLY a JSON object with NO markdown formatting.
    
    Resume text: ${resumeText}
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
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
