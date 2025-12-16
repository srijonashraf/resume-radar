import { useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { generateCareerMap } from "../../services/api";
import { useStore } from "../../store/useStore";

const CareerMap = () => {
  const { resumeData } = useStore();
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [careerData, setCareerData] = useState<any>(null);
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
      setCareerData(result); // Store the full career data

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
            // Store additional data for tooltips/panels
            path: path.name,
            pathDescription: path.description,
            difficulty: path.difficulty,
            timeToGoal: path.timeToGoal,
            stepData: step,
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

      {/* Career Path Details */}
      {careerData && (
        <div className="mt-8 space-y-6">
          {/* Current Role & Skills Summary */}
          <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">📍 Current Position Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Current Role</h4>
                <p className="text-xl font-bold text-white">{careerData.currentRole}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2">Current Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {careerData.currentSkills.slice(0, 8).map((skill: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-slate-800 rounded-full text-xs text-slate-300">
                      {skill}
                    </span>
                  ))}
                  {careerData.currentSkills.length > 8 && (
                    <span className="px-2 py-1 bg-slate-700 rounded-full text-xs text-slate-400">
                      +{careerData.currentSkills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Career Paths Overview */}
          <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">🛤️ Career Path Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {careerData.paths.map((path: any, pathIndex: number) => (
                <div
                  key={pathIndex}
                  className={`p-4 rounded-lg border ${
                    pathIndex === 0 ? 'bg-blue-950/30 border-blue-500/30' :
                    pathIndex === 1 ? 'bg-purple-950/30 border-purple-500/30' :
                    'bg-green-950/30 border-green-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{path.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      path.difficulty === 'Low' ? 'bg-green-900/30 text-green-300' :
                      path.difficulty === 'Medium' ? 'bg-yellow-900/30 text-yellow-300' :
                      'bg-red-900/30 text-red-300'
                    }`}>
                      {path.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{path.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>⏱️ {path.timeToGoal}</span>
                    <span>📈 {path.steps.length} steps</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Recommendations */}
          {careerData.recommendations && careerData.recommendations.length > 0 && (
            <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold text-slate-300 mb-4">💡 Strategic Recommendations</h3>
              <ul className="space-y-2">
                {careerData.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <span className="text-blue-400 mr-3 mt-0.5">•</span>
                    <span className="text-slate-300 text-sm leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CareerMap;
