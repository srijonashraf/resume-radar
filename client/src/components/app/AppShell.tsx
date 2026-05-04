import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../layout/Logo";
import { Button } from "../ui";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useAuth } from "../../hooks/useAuth";
import OnboardingOverlay from "../onboarding/OnboardingOverlay";

const AppShell = ({ children }: { children?: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-500/30">
      <OnboardingOverlay />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold font-heading text-stone-900 tracking-tight">
              Resumetra
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {isLoading ? (
              <div className="h-4 w-20 animate-pulse rounded bg-stone-200" />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-stone-500 truncate max-w-[200px]">
                  {user?.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-sm hover:text-red-600">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="bg-amber-50 text-amber-700 text-sm rounded-full px-3 py-1 font-medium">
                  Guest Mode
                </span>
                <Link
                  to="/login"
                  className="text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-stone-500 hover:text-stone-900"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-white px-4 pb-4 pt-3 space-y-3">
            {isLoading ? null : isLoggedIn ? (
              <>
                <div className="text-sm text-stone-500 truncate">{user?.email}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="block text-sm hover:text-red-600"
                >
                  Logout
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <span className="block text-sm text-amber-700 font-medium">Guest Mode</span>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AppShell;
