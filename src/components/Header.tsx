export function Header({ isGenerating }: { isGenerating: boolean }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
      <div>
        <h1 className="text-xl font-bold text-gray-900">AI Website Builder</h1>
        <p className="text-sm text-gray-500">Describe your business, get a website instantly</p>
      </div>
      {isGenerating && (
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full animate-pulse">
          ✦ Generating…
        </span>
      )}
    </header>
  );
}
