import { useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { generateCareerMap } from "../services/api";
import { useStore } from "../state/useStore";

const CareerMap = () => {
  const { resumeData } = useStore();
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(false);
  const fgRef = useRef<any>(null);

  const handleGenerate = async () => {
    if (!resumeData?.rawText) {
      alert("Please upload a resume first.");
      return;
    }
    setLoading(true);
    try {
      const result = await generateCareerMap(resumeData.rawText);

      // Transform API result into Graph Data
      const nodes: any[] = [];
      const links: any[] = [];

      result.paths.forEach((path: any, pathIndex: number) => {
        path.steps.forEach((step: any, stepIndex: number) => {
          const nodeId = `${pathIndex}-${stepIndex}`;
          nodes.push({
            id: nodeId,
            name: step.role,
            group: pathIndex,
            status: step.status,
            val: stepIndex + 1, // Size based on level
          });

          if (stepIndex > 0) {
            links.push({
              source: `${pathIndex}-${stepIndex - 1}`,
              target: nodeId,
              label: step.skills_needed?.join(", ") || "Promotion",
            });
          }
        });
      });

      setGraphData({ nodes, links });
    } catch (error) {
      console.error("Failed to generate career map:", error);
      alert("Failed to generate career map. Ensure server is running.");
    }
    setLoading(false);
  };

  return (
    <div className="card p-4 sm:p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-blue-400">
          🌌 Holographic Career Map
        </h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 w-full sm:w-auto"
        >
          {loading ? "Consulting the Oracle..." : "Generate Future Paths"}
        </button>
      </div>

      <div className="h-[400px] sm:h-[500px] lg:h-[600px] border-2 border-purple-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950/10 to-slate-950 relative shadow-2xl shadow-purple-500/10">
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node: any) =>
              node.status === "current"
                ? "#3b82f6"
                : node.status === "future"
                ? "#a855f7"
                : "#22c55e"
            }
            nodeRelSize={6}
            linkColor={() => "#6b21a8"}
            linkWidth={2}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={3}
            backgroundColor="transparent"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="text-4xl sm:text-6xl mb-4">🚀</div>
              <p className="text-slate-400 text-sm sm:text-base">
                Click "Generate Future Paths" to visualize your career
                trajectory.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {graphData.nodes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-400">Current Role</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-slate-400">Future Step</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-400">Goal</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerMap;
