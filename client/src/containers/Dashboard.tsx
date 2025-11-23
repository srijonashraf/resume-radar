import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStore, AnalysisHistoryEntry } from "../state/useStore";
import { analyzeResume } from "../services/api";
import PdfUploader from "../components/PdfUploader";
import AnalysisResults from "../components/AnalysisResults";
import JobDescriptionInput from "../components/JobDescriptionInput";
import JobMatchResults from "../components/JobMatchResults";
import AnalysisHistory from "../components/AnalysisHistory";
import CareerMap from "../components/CareerMap";
import SmartEditor from "../components/SmartEditor";
import GuestBanner from "../components/GuestBanner";
import Logo from "../components/Logo";
import { v4 as uuidv4 } from "uuid";
import { fetchHistory, saveHistory } from "../services/history";
import { supabase } from "../services/supabase";

const Dashboard = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const resumeData = useStore((state) => state.resumeData);
  const analysisResults = useStore((state) => state.analysisResults);
  const jobMatchResults = useStore((state) => state.jobMatchResults);
  const analysisHistory = useStore((state) => state.analysisHistory);
  const isGuest = useStore((state) => state.isGuest);
  const guestMessage = useStore((state) => state.guestMessage);
  const setAnalysisResults = useStore((state) => state.setAnalysisResults);
  const addAnalysisHistory = useStore((state) => state.addAnalysisHistory);
  const setAnalysisHistory = useStore((state) => state.setAnalysisHistory);
  const clearCurrentAnalysis = useStore((state) => state.clearCurrentAnalysis);
  const setGuestMode = useStore((state) => state.setGuestMode);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await fetchHistory();
      setAnalysisHistory(history);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadHistory();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Clear guest mode when user logs in
        setGuestMode(false);
        loadHistory();
      } else {
        setAnalysisHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [setAnalysisHistory, setGuestMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Clear all state
    setAnalysisHistory([]);
    clearCurrentAnalysis();
  };

  // Analyze resume when it's uploaded
  useEffect(() => {
    const analyzeUploadedResume = async () => {
      if (resumeData && !analysisResults) {
        setIsAnalyzing(true);
        setError(null);

        try {
          const results = await analyzeResume(resumeData.rawText);
          setAnalysisResults(results);

          // Handle guest mode if present in response
          if (results.isGuest) {
            setGuestMode(true, results.message);
          }

          // Add to history only if not a guest or if guest has remaining analyses
          if (!results.isGuest || results.remainingAnalyses > 0) {
            const historyEntry: AnalysisHistoryEntry = {
              id: uuidv4(),
              date: new Date(),
              resumeData,
              analysisResults: results,
            };

            addAnalysisHistory(historyEntry);

            // Save to Supabase if user is logged in (not a guest)
            if (user) {
              await saveHistory(historyEntry);
            }
          }
        } catch (err: any) {
          console.error("Error analyzing resume:", err);

          // Handle guest limit errors
          if (
            err.response?.status === 429 &&
            err.response?.data?.requiresLogin
          ) {
            setError(err.response.data.message);
            setGuestMode(true, err.response.data.message);
          } else if (err.code === "ERR_BAD_REQUEST") {
            setError(err.response.data.error);
          } else {
            setError("Failed to analyze resume. Please try again.");
          }
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    analyzeUploadedResume();
  }, [
    resumeData,
    analysisResults,
    setAnalysisResults,
    addAnalysisHistory,
    user,
    setGuestMode,
  ]);

  const handleNewAnalysis = () => {
    clearCurrentAnalysis();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans selection:bg-blue-500/30">
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent tracking-tight">
                ResumeRadar
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-slate-400 truncate max-w-[200px]">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-x-4">
                  <Link
                    to="/login"
                    className="text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {resumeData && (
                <button
                  onClick={clearCurrentAnalysis}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Clear Resume
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-800 pt-4 space-y-3">
              {user ? (
                <>
                  <div className="text-sm text-slate-400 truncate">
                    {user.email}
                  </div>
                  {resumeData && (
                    <button
                      onClick={() => {
                        clearCurrentAnalysis();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      Clear Resume
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-medium transition-all shadow-lg shadow-blue-500/20 text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!resumeData ? (
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="card p-8 mb-8"
              >
                <h2 className="text-3xl font-bold text-white mb-4 text-center">
                  Upload Your Resume
                </h2>
                <p className="text-slate-400 mb-8 text-center max-w-2xl mx-auto text-lg">
                  Our AI will analyze your resume and provide personalized
                  feedback to help you improve it.
                </p>

                <PdfUploader />
              </motion.div>

              {analysisHistory.length > 0 && (
                <div className="mt-8">
                  <AnalysisHistory />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {isAnalyzing ? (
                <div className="card p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Analyzing your resume...
                  </h2>
                  <p className="text-slate-400 text-lg">
                    This may take a few moments.
                  </p>
                </div>
              ) : error ? (
                <div className="card p-8 text-center border-red-900/50 bg-red-950/10">
                  <div className="text-4xl mb-4">⚠️</div>
                  <h2 className="text-xl font-bold text-red-400">
                    Analysis Error
                  </h2>
                  <p className="text-red-300 mt-2 mb-6">{error}</p>
                  <button
                    onClick={handleNewAnalysis}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/20"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {/* Guest Banner */}
                  {isGuest && !user && guestMessage && (
                    <GuestBanner
                      message={guestMessage}
                      onClose={() => setGuestMode(false)}
                    />
                  )}

                  {analysisResults && (
                    <AnalysisResults analysisResults={analysisResults} />
                  )}

                  {/* Only show advanced features for authenticated users */}
                  {user && (
                    <>
                      <CareerMap />

                      {!jobMatchResults ? (
                        <JobDescriptionInput />
                      ) : (
                        <JobMatchResults jobMatchResults={jobMatchResults} />
                      )}

                      <SmartEditor />
                    </>
                  )}

                  {!user && isGuest && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">
                        Want to unlock advanced features like job matching and
                        career mapping?
                      </p>
                      <Link
                        to="/signup"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
                      >
                        Create Free Account
                      </Link>
                    </div>
                  )}

                  {analysisHistory.length > 0 && <AnalysisHistory />}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-400">
            Made with <span className="text-red-500">❤</span> by{" "}
            <a
              href="https://github.com/srijonashraf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              srijonashraf
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
