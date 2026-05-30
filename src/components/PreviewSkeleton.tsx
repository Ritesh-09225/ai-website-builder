export function PreviewSkeleton() {
  return (
    <div className="flex-1 w-full p-8 bg-gray-50 flex flex-col gap-6 animate-pulse">
      {/* Fake nav */}
      <div className="flex items-center justify-between mb-2">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-6 bg-gray-200 rounded w-24" />
      </div>
      {/* Fake hero */}
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="h-10 bg-gray-200 rounded w-2/3" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-indigo-200 rounded-full w-36 mt-2" />
      </div>
      {/* Fake cards */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full" />
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
