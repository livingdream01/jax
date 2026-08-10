"use client";

export default function Skeleton({ className = "", lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={`animate-shimmer rounded-lg bg-bg-surface border border-border-subtle ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-bg-glass rounded mx-4 ${i === 0 ? "mt-4" : "mt-2"} ${i === lines - 1 ? "mb-4 w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}