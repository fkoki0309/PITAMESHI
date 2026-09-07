import { SwipeResult } from "./SwipeCard";

export function SwipeButtons({ onSwipe }: { onSwipe: (result: SwipeResult) => void }) {
  return (
    <>
      <div className="flex items-center justify-center gap-6 mt-6">
        <button
          onClick={() => onSwipe("no")}
          className="w-16 h-16 rounded-full bg-white border-2 border-red-300 text-3xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        >✕</button>
        <button
          onClick={() => onSwipe("maybe")}
          className="w-14 h-14 rounded-full bg-white border-2 border-yellow-300 text-2xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        >🤔</button>
        <button
          onClick={() => onSwipe("yes")}
          className="w-16 h-16 rounded-full bg-white border-2 border-green-300 text-3xl shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        >❤️</button>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-3 px-2">
        <span>← いらない</span>
        <span>↑ まあいい</span>
        <span>いきたい →</span>
      </div>
    </>
  );
}
