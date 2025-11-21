# ResumeRadar

An AI-powered resume analyzer dashboard built with React, TypeScript, and TailwindCSS. This application helps users improve their resumes by providing AI-driven analysis and job matching.

## Features

- **Resume Upload & Analysis**: Upload your resume in PDF format and get instant AI-powered analysis.
- **Skill Assessment**: Receive scores for your skills, experience, and resume formatting.
- **Job Description Matching**: Compare your resume against job descriptions to see how well you match.
- **Improvement Suggestions**: Get personalized suggestions to improve your resume.
- **Analysis History**: Keep track of your previous resume analyses.

## Technologies Used

- React with TypeScript
- TailwindCSS for styling
- Zustand for state management
- Framer Motion for animations
- Recharts for data visualization
- AI API for resume analysis
- PDF.js for PDF parsing

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-resume-analyzer.git
   cd ai-resume-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Upload your resume in PDF format.
2. View the AI analysis of your resume.
3. Enter a job description to compare with your resume.
4. Review the job match analysis and suggestions.
5. Check your analysis history for previous uploads.

## Project Structure

- `/src/components`: Reusable UI components
- `/src/containers`: Page-level components
- `/src/state`: Global state management with Zustand
- `/src/services`: API integrations (Gemini)
- `/src/utils`: Helper functions and utilities
- `/src/assets`: Static assets

## License

This project is licensed under the MIT License - see the LICENSE file for details.
