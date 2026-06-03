import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      {/* Background gradient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[50vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Spinning logo */}
        <div className="animate-spin-logo">
          <Image
            src="/logo.png"
            alt="Track Rails"
            width={96}
            height={96}
            className="h-20 w-20 sm:h-24 sm:w-24"
            priority
          />
        </div>

        {/* Brand text */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Track <span className="text-accent">Rails</span>
          </h1>
          <p className="mt-2 text-sm text-muted animate-pulse">
            Loading your encrypted music layer...
          </p>
        </div>
      </div>
    </div>
  );
}
