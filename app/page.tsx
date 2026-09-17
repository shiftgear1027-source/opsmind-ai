"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  Radar,
  Sparkles,
  Target,
} from "lucide-react";
import { DATASET_META, operations } from "@/data/operations";
import { runAnalysis } from "@/lib/aiAnalysis";
import { calculateTotalDowntime, getDepartmentStats } from "@/lib/analytics";
import { formatMinutes } from "@/lib/format";

const analysis = runAnalysis(operations);
const departments = getDepartmentStats(operations);

const pipeline = [
  {
    label: "Problem",
    body: "Operational data piles up faster than anyone can read it. Managers see rows, not risk.",
    icon: Database,
  },
  {
    label: "Analysis",
    body: "OpsMind aggregates every record by department, site, cause and time, then scores each dimension.",
    icon: BrainCircuit,
  },
  {
    label: "Insight",
    body: "Repeating failures, statistical outliers and concentrated cost surface on their own.",
    icon: Radar,
  },
  {
    label: "Action",
    body: "Each finding arrives as a ranked, owned recommendation with the records that justify it.",
    icon: Target,
  },
];

export default function LandingPage() {
  const topDepartment = departments[0];

  return (
    <main className="min-h-screen bg-ink-950 text-slate-200">
      {/* A single restrained light source behind the hero, not a gradient wash. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(79,70,229,0.28) 0%, rgba(11,17,32,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ai-600 text-white">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">OpsMind AI</p>
              <p className="text-[11px] text-slate-500">
                Turn operational data into intelligent actions
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300">
            Demo mode · {DATASET_META.recordCount} mock records
          </span>
        </header>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              From operational data to intelligent decisions.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">
              AI-powered operational analysis that helps teams identify risks,
              understand patterns and take action faster.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
              >
                Explore dashboard
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/dashboard/insights"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                View AI insights
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {[
                {
                  label: "Records analysed",
                  value: DATASET_META.recordCount.toString(),
                },
                {
                  label: "Downtime observed",
                  value: formatMinutes(calculateTotalDowntime(operations)),
                },
                {
                  label: "Anomalies detected",
                  value: analysis.anomalies.length.toString(),
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-slate-500">{stat.label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* The hero is the product's own output, not an abstract illustration. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-ai-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI executive summary
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {analysis.executiveSummary}
            </p>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
              {analysis.recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={recommendation.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-slate-400">
                    {recommendation.action}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-5 border-t border-white/10 pt-4 text-[11px] text-slate-500">
              Generated from {DATASET_META.recordCount} synthetic records ·{" "}
              {topDepartment?.department} is the largest contributor at{" "}
              {topDepartment?.incidents} incidents
            </p>
          </motion.div>
        </section>

        <section className="border-t border-white/10 py-14">
          <h2 className="text-sm font-medium text-slate-400">
            What happens between the data and the decision
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-4">
            {pipeline.map((step, index) => (
              <motion.li
                key={step.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <step.icon className="h-4 w-4 text-ai-400" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  {step.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-white/10 py-8 text-xs text-slate-500">
          Demo environment using synthetic operational data created for this
          innovation challenge. No authentication is configured and no real company
          data is used.
        </footer>
      </div>
    </main>
  );
}
