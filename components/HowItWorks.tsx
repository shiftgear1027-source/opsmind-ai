"use client";

import { motion } from "framer-motion";
import { ArrowRight, Database, Radar, Sparkles, Target } from "lucide-react";
import { useOps } from "@/context/OpsContext";

export function HowItWorks() {
  const { records, analysis } = useOps();

  const steps = [
    {
      label: "Collect",
      title: "Operational data",
      detail: `${records.length} records covering incidents, downtime, cost and resolution.`,
      icon: Database,
    },
    {
      label: "Analyse",
      title: "Analysis engine",
      detail:
        "Aggregates by department, site, category and cause, then scores each dimension.",
      icon: Sparkles,
    },
    {
      label: "Detect",
      title: "Patterns and anomalies",
      detail: `${analysis.keyFindings.length} findings and ${analysis.anomalies.length} anomalies identified in this selection.`,
      icon: Radar,
    },
    {
      label: "Recommend",
      title: "Actionable decisions",
      detail: `${analysis.recommendations.length} ranked actions, each tied back to the records behind it.`,
      icon: Target,
    },
  ];

  return (
    <section className="card p-5">
      <header className="mb-5">
        <h2 className="text-sm font-semibold text-slate-900">
          How OpsMind AI works
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Raw records become a ranked set of actions in four steps. Every number
          below updates with the current filters.
        </p>
      </header>

      <ol className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <motion.li
            key={step.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="relative rounded-lg border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-card">
                <step.icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-xs font-medium text-slate-500">
                {index + 1}. {step.label}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {step.detail}
            </p>

            {index < steps.length - 1 && (
              <ArrowRight
                className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-300 md:block"
                aria-hidden
              />
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
