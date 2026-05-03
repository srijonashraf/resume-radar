interface RewriteDiffProps {
  before: string;
  after: string;
}

export default function RewriteDiff({ before, after }: RewriteDiffProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-stone-500 mb-1">Before</p>
        <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3 border border-stone-100">
          {before}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-emerald-600 mb-1">After</p>
        <p className="text-sm text-stone-900 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
          {after}
        </p>
      </div>
    </div>
  );
}
