export default function TopBar() {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30 text-white">
      <div className="flex items-center gap-2">
        <span className="bg-red-600 px-3 py-1 rounded-full text-sm font-bold">
          LIVE
        </span>
        <span className="font-semibold tracking-wide">
          REVOLVR LIVE
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-gray-400 border border-white" />
          <div className="w-6 h-6 rounded-full bg-gray-500 border border-white" />
        </div>
        <span className="text-sm font-medium">1.2K</span>
      </div>
    </div>
  );
}