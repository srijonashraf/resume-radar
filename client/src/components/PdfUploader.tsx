import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useStore, ResumeData } from "../state/useStore";
import { extractTextFromPDF } from "../utils/pdfUtils";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

const PdfUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setResumeData = useStore((state) => state.setResumeData);
  const resumeData = useStore((state) => state.resumeData);
  const isGuest = useStore((state) => state.isGuest);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is a PDF
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    // Check if guest has already analyzed a resume
    if (isGuest && resumeData) {
      setError("You've already used your free analysis. Please login to analyze more resumes.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract text from PDF
      const rawText = await extractTextFromPDF(file);

      // Update store with resume data
      const resumeData: ResumeData = {
        file,
        rawText,
      };

      setResumeData(resumeData);
    } catch (err) {
      console.error("Error processing PDF:", err);
      setError("Failed to process PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      // Create a new FileList with the dropped file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Update the file input
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;

        // Trigger the onChange event manually
        const event = new Event("change", { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 group
          ${
            isLoading
              ? "bg-slate-900/50 border-slate-700"
              : "border-slate-700 hover:border-blue-500 hover:bg-slate-900/80 bg-slate-900/30"
          }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />

        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-500" />
          <DocumentArrowUpIcon className="relative h-16 w-16 mx-auto text-blue-500 mb-4 group-hover:scale-110 transition-transform duration-300" />
        </div>

        {isLoading ? (
          <div className="text-slate-300">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p>Processing PDF...</p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-medium text-slate-200 mb-2">
              Drag & drop your resume PDF here
            </p>
            <p className="text-sm text-slate-400 group-hover:text-blue-400 transition-colors">
              or click to browse files
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-400 bg-red-900/20 py-2 px-4 rounded-lg inline-block text-sm border border-red-900/50">
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default PdfUploader;
