"use client";

const STYLES = `
@keyframes stats-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

.animate-stats-scroll-marquee {
  animation: stats-scroll-marquee 30s linear infinite;
}
`;

interface StatEntry {
  value: string;
  label: string;
}

function StatsMarqueeItem({ stats }: { stats: StatEntry[] }) {
  return (
    <div className="flex items-center space-x-16 px-8">
      {stats.map((stat, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-accent font-black text-sm md:text-base tabular-nums">{stat.value}</span>
          <span className="text-white/50 text-xs md:text-sm whitespace-nowrap">{stat.label}</span>
          {i < stats.length - 1 && <span className="text-accent/40 ml-8">✦</span>}
        </span>
      ))}
    </div>
  );
}

export default function StatsMarquee({ stats }: { stats: StatEntry[] }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="w-full overflow-hidden border-y border-accent/10 bg-accent/5 py-4">
        <div className="flex w-max animate-stats-scroll-marquee text-sm font-medium tracking-wide uppercase">
          <StatsMarqueeItem stats={stats} />
          <StatsMarqueeItem stats={stats} />
        </div>
      </div>
    </>
  );
}
