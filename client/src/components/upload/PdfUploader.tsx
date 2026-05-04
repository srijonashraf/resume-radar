import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useStore } from "../../store/useStore";
import { useAuth } from "../../hooks/useAuth";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import Spinner from "../ui/Spinner";

const PdfUploader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeData = useStore((state) => state.resumeData);
  const { user } = useAuth();
  const isGuest = !user;
  const setResumeData = useStore((state) => state.setResumeData);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file");
      return;
    }

    if (isGuest && resumeData) {
      setError(
        "You've already used your free analysis. Please sign in to analyze more resumes."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Store the file — Dashboard will trigger server-side extraction
      setResumeData({ file, rawText: "" });
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

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;

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
              ? "bg-amber-50/50 border-amber-300"
              : "border-stone-300 hover:border-amber-500 hover:bg-amber-50/50 bg-white"
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
          <DocumentArrowUpIcon className="relative h-16 w-16 mx-auto text-amber-500 mb-4 group-hover:scale-110 transition-transform duration-300" />
        </div>

        {isLoading ? (
          <div className="text-stone-600">
            <Spinner size="md" className="mb-2" />
            <p>Processing PDF...</p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-medium text-stone-800 mb-2">
              Drag & drop your resume PDF here
            </p>
            <p className="text-sm text-stone-400 group-hover:text-amber-600 transition-colors">
              or click to browse files
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-600 bg-red-50 py-2 px-4 rounded-lg inline-block text-sm border border-red-200">
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default PdfUploader;
