export default function LoadingScreen({ label = 'Restoring your workspace' }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen__inner">
        <img src="/logo/logo.svg" alt="SlotForge" className="h-14 w-14 object-contain" />
        <div className="newtons-cradle" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => <span className="newtons-cradle__dot" key={index} />)}
        </div>
        <p className="text-label-caps text-mono-grey" style={{ fontSize: 10 }}>{label}</p>
      </div>
    </div>
  );
}
