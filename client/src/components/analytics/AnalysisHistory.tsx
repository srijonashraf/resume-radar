import EmptyState from "../ui/EmptyState";

const AnalysisHistory = () => {
  return (
    <EmptyState
      icon={<span>&#x1F4CB;</span>}
      title="No History"
      description="Your analysis history will appear here"
    />
  );
};

export default AnalysisHistory;
