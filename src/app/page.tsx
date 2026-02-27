"use client";

import { ProposalForm } from "@/components/ProposalForm";
import { ChatView } from "@/components/ChatView";
import { StatusBar } from "@/components/StatusBar";
import { ConclusionPanel } from "@/components/ConclusionPanel";
import { useDebateStream } from "@/hooks/useDebateStream";

export default function Home() {
  const {
    messages,
    activeAgent,
    currentRound,
    turnCount,
    isRunning,
    isPaused,
    isConcluding,
    conclusion,
    iteration,
    error,
    startDebate,
    pauseDebate,
    continueWithComment,
    stop,
    refine,
    reset,
  } = useDebateStream();

  const hasStarted = isRunning || messages.length > 0 || conclusion !== null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              🗣️ Multi-Agent Debate
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              16 agents debate sequentially — questions, critiques, and rebuttals
            </p>
          </div>
          {hasStarted && (
            <div className="flex gap-2">
              {isRunning && (
                <button
                  onClick={stop}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
                >
                  ⏹ Stop & Conclude
                </button>
              )}
              <button
                onClick={reset}
                disabled={isRunning || isConcluding}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 transition-colors text-xs font-medium disabled:opacity-40"
              >
                🔄 New Session
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {!hasStarted ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-xl">
              <ProposalForm
                onSubmit={startDebate}
                disabled={isRunning || isConcluding}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatView messages={messages} activeAgent={activeAgent} />

            <StatusBar
              activeAgent={activeAgent}
              currentRound={currentRound}
              turnCount={turnCount}
              isRunning={isRunning}
              isPaused={isPaused}
              isConcluding={isConcluding}
              onPause={pauseDebate}
              onContinue={continueWithComment}
              onStop={stop}
            />

            {error && (
              <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                <p className="text-xs text-red-400">⚠️ {error}</p>
              </div>
            )}

            {conclusion && (
              <div className="p-4 border-t border-zinc-800">
                <ConclusionPanel
                  conclusion={conclusion}
                  onRefine={refine}
                  iteration={iteration}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
