export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="text-accent">♪</span>
            <span>Track Rails</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a
              href="https://story.foundation"
              className="transition-colors hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by Story Protocol
            </a>
            <span className="hidden sm:inline">·</span>
            <span>Built for Aeneid Testnet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
