"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Sparkles, User } from "lucide-react";
import { useOps } from "@/context/OpsContext";
import { getAIEngine } from "@/lib/aiAnalysis";
import type { AIAnswer } from "@/types/operations";

const SUGGESTIONS = [
  "Which department requires the most attention and why?",
  "What department has the highest downtime?",
  "Which issue occurs most frequently?",
  "Where are the biggest risks?",
  "Why is Plant B performing poorly?",
  "What is driving the cost impact?",
  "How long are incidents taking to resolve?",
];

interface Turn {
  id: number;
  question: string;
  answer: AIAnswer | null;
}

export function AskAIPanel() {
  const { records } = useOps();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, thinking]);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || thinking) return;

    counter.current += 1;
    const id = counter.current;
    setTurns((current) => [...current, { id, question: trimmed, answer: null }]);
    setInput("");
    setThinking(true);

    // Short pause so the reasoning step is visible; the engine itself is
    // synchronous and runs entirely over the loaded records.
    window.setTimeout(() => {
      const answer = getAIEngine().answer(trimmed, records);
      setTurns((current) =>
        current.map((turn) => (turn.id === id ? { ...turn, answer } : turn)),
      );
      setThinking(false);
    }, 620);
  };

  return (
    <section className="card flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-ai-600 p-1.5 text-white">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Ask AI about this data
            </h2>
            <p className="text-xs text-slate-500">
              Answers are computed from the {records.length} records currently in
              scope.
            </p>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-[18rem] flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-thin"
      >
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="h-6 w-6 text-slate-300" aria-hidden />
            <p className="mt-2 text-sm font-medium text-slate-700">
              Ask a question about the current selection
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Every answer is derived from the filtered records, with the supporting
              numbers shown alongside it. Pick a suggestion below or type your own.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {turns.map((turn) => (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex justify-end">
                <p className="flex max-w-[85%] items-start gap-2 rounded-xl rounded-br-sm bg-slate-900 px-3.5 py-2.5 text-sm text-white">
                  {turn.question}
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                </p>
              </div>

              {turn.answer && (
                <div className="ai-surface p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-ai-600" aria-hidden />
                    <span className="text-xs font-medium text-ai-700">
                      AI answer · {turn.answer.scope}
                    </span>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                    {turn.answer.answer}
                  </p>

                  {turn.answer.metrics.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {turn.answer.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-lg border border-white/70 bg-white/70 p-2.5"
                        >
                          <dt className="truncate text-[11px] text-slate-500">
                            {metric.label}
                          </dt>
                          <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                            {metric.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  <div className="mt-3 rounded-lg border border-ai-200 bg-white/80 p-3">
                    <p className="text-xs font-medium text-ai-700">Recommendation</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {turn.answer.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-slate-500"
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18 }}
                  className="h-1.5 w-1.5 rounded-full bg-ai-500"
                />
              ))}
            </span>
            Scanning {records.length} records
          </motion.div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.slice(0, turns.length > 0 ? 3 : 5).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              disabled={thinking}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-ai-300 hover:bg-ai-50 hover:text-ai-700 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <label className="sr-only" htmlFor="ask-ai-input">
            Ask a question about this data
          </label>
          <input
            id="ask-ai-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about downtime, cost, risk, resolution time or a department"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-ai-400"
          />
          <button
            type="submit"
            disabled={thinking || input.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ai-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-ai-700 disabled:opacity-40"
          >
            Ask
            <CornerDownLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}

export default AskAIPanel;
