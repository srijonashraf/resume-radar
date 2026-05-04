import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui";

const ErrorFallback = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">&#x26A0;&#xFE0F;</div>
        <h1 className="text-3xl font-bold text-stone-900 mb-3">
          Something went wrong
        </h1>
        <p className="text-stone-500 mb-8">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => navigate("/")}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
