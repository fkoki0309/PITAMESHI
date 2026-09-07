export function VoteCompletedScreen({
  completedCount,
  participantCount,
}: {
  completedCount: number;
  participantCount: number;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="text-center">
        <p className="text-5xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">投票完了！</h1>
        <p className="text-muted-foreground">{completedCount} / {participantCount}人が完了</p>
        <p className="text-sm text-muted-foreground mt-2">他の参加者を待っています…</p>
      </div>
    </div>
  );
}
