"use client";

import React from "react";

export function BuildVersion() {
  const commitHash = process.env.NEXT_PUBLIC_GIT_COMMIT || "dev";
  const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER || "0";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || "unknown";

  const githubCommitUrl =
    commitHash && commitHash !== "dev" && commitHash !== "local"
      ? `https://github.com/natkritta-ch/Project_survey/commit/${commitHash}`
      : null;

  return (
    <aside
      aria-label="System build version info"
      className="fixed bottom-1.5 right-2 z-50 pointer-events-auto select-none"
    >
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/40 bg-background/80 dark:bg-zinc-900/80 backdrop-blur-sm text-[11px] font-mono text-muted-foreground/80 hover:text-foreground hover:bg-background/95 transition-all shadow-xs"
        title={`เวอร์ชันระบบ: Build #${buildNumber} | Commit: ${commitHash} | เวลาบิลด์: ${buildTime}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
          aria-hidden="true"
        />
        <span>Build #{buildNumber}</span>
        <span className="opacity-40">•</span>
        {githubCommitUrl ? (
          <a
            href={githubCommitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-primary transition-colors"
          >
            {commitHash}
          </a>
        ) : (
          <span>{commitHash}</span>
        )}
        <span className="opacity-40">•</span>
        <span className="whitespace-nowrap">{buildTime}</span>
      </div>
    </aside>
  );
}

export default BuildVersion;
