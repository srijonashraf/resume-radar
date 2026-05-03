import Card from "../ui/Card";

interface LearningPathCardProps {
  courses: string[];
  projects: string[];
  timeline: string;
  targetBullet: string;
}

export default function LearningPathCard({
  courses,
  projects,
  timeline,
  targetBullet,
}: LearningPathCardProps) {
  return (
    <Card padding="md" className="bg-blue-50/50 border-blue-100">
      <h4 className="text-sm font-semibold text-blue-700 mb-3">
        Learning Path
      </h4>

      <p className="text-xs text-stone-500 mb-1">Timeline</p>
      <p className="text-sm font-medium text-stone-800 mb-3">{timeline}</p>

      {courses.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-stone-500 mb-1">Recommended Courses</p>
          <ul className="space-y-1">
            {courses.map((course, i) => (
              <li key={i} className="text-sm text-stone-700 flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                {course}
              </li>
            ))}
          </ul>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-stone-500 mb-1">Practice Projects</p>
          <ul className="space-y-1">
            {projects.map((project, i) => (
              <li key={i} className="text-sm text-stone-700 flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                {project}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs text-stone-500 mb-1">Target Resume Bullet</p>
        <p className="text-sm text-stone-700 italic">{targetBullet}</p>
      </div>
    </Card>
  );
}
