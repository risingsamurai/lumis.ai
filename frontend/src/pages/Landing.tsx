import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { firebaseEnabled } from "../services/firebase";
import { Plasma } from "../components/ui/Plasma";
import { BiasAnalysisDashboard } from "../components/BiasAnalysisDashboard";

// ─── Feature card data ────────────────────────────────────────────────────────
const USE_CASES = ["Hiring", "Lending", "Healthcare", "Criminal Justice"] as const;

const STEPS = [
  { step: "01", title: "Upload", copy: "Bring CSV/JSON datasets or choose demo data." },
  { step: "02", title: "Analyze", copy: "Compute AIF360 metrics and compliance checks." },
  { step: "03", title: "Fix", copy: "Generate mitigation plans with Gemini guidance." },
] as const;

const STATS = [
  { value: "2.3B", label: "people affected by biased AI annually" },
  { value: "94%", label: "of firms lack an AI fairness strategy" },
  { value: "3×", label: "faster remediation with guided mitigation" },
] as const;

const IMPACT_COUNTERS = [
  { value: "2.4B+", label: "People affected by biased AI decisions annually" },
  { value: "73%", label: "of HR teams use AI with no bias audit" },
  { value: "SDG 10", label: "Our core UN development goal" },
] as const;

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-bg text-white">
      {/* ── SDG 10 IMPACT BANNER ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50" style={{ background: 'linear-gradient(to right, #1a1a2e, #16213e)' }}>
        <div className="flex items-center justify-center px-4 py-2 text-xs text-white/70">
          LUMIS.AI addresses UN SDG 10 — Reduced Inequalities | Helping organizations detect and fix AI bias in hiring, lending & healthcare
        </div>
      </div>

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Plasma WebGL background – fills the entire hero section */}
        <div className="absolute inset-0 z-0">
          <Plasma
            color="#6C47FF"
            speed={0.55}
            direction="forward"
            scale={1.15}
            opacity={0.72}
            mouseInteractive={true}
          />
          {/* Gradient overlay so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/40 via-brand-bg/20 to-brand-bg" />
        </div>

        {/* Live-badge */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="relative z-10 mb-6 inline-flex items-center gap-2 rounded-full border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-1.5 text-xs font-medium text-brand-secondary backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-secondary" />
          2.3 B people affected by biased AI annually
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="relative z-10 max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl"
        >
          Detect Bias.{" "}
          <span className="bg-gradient-to-r from-brand-primary via-purple-400 to-brand-secondary bg-clip-text text-transparent">
            Build Fairness.
          </span>{" "}
          Deploy With Confidence.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="relative z-10 mt-6 max-w-xl text-base text-white/60 md:text-lg"
        >
          LUMIS.AII helps teams proactively detect and mitigate unfair outcomes
          in AI models — before they reach production.
        </motion.p>

        {/* Impact Counters */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="relative z-10 mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 md:gap-8"
        >
          {IMPACT_COUNTERS.map((counter, i) => (
            <motion.div
              key={counter.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <p className="bg-gradient-to-r from-brand-primary via-purple-400 to-brand-secondary bg-clip-text text-4xl font-bold text-transparent">
                {counter.value}
              </p>
              <p className="mt-2 text-sm text-white/60">{counter.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {user ? (
            <Button onClick={() => navigate("/dashboard")} aria-label="Navigate to Dashboard">
              Go to Dashboard
            </Button>
          ) : (
            <Button
              onClick={() => {
                if (!firebaseEnabled) {
                  toast("Add Firebase env vars to enable Google Sign-In.");
                  return;
                }
                void signInWithGoogle();
              }}
              aria-label="Sign in with Google"
            >
              Sign in with Google
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/audit/new?demo=1")}
            aria-label="Try demo analysis"
          >
            Try Demo
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
        >
          <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="h-1.5 w-1 rounded-full bg-white/50"
            />
          </div>
        </motion.div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-brand-surface/60 px-4 py-10 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map(({ value, label }, i) => (
            <motion.div
              key={value}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="text-center"
            >
              <p className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-4xl font-bold text-transparent">
                {value}
              </p>
              <p className="mt-1 text-sm text-white/50">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── USE CASES ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand-primary"
        >
          Where we make a difference
        </motion.p>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          custom={1}
          className="mb-10 text-center text-3xl font-bold"
        >
          Key Use Cases
        </motion.h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((domain, i) => (
            <motion.div
              key={domain}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i * 0.5}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="group relative overflow-hidden border-white/8 transition-colors hover:border-brand-primary/40">
                {/* Subtle plasma-tinted glow on hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute -inset-10 bg-brand-primary/10 blur-2xl" />
                </div>
                <p className="text-xs text-white/40">Use Case</p>
                <p className="mt-2 text-xl font-bold">{domain}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-brand-secondary"
        >
          Simple three-step process
        </motion.p>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          custom={1}
          className="mb-10 text-center text-3xl font-bold"
        >
          How It Works
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ step, title, copy }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i * 0.4}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="relative overflow-hidden">
                <span className="absolute right-4 top-4 text-5xl font-black text-white/4">
                  {step}
                </span>
                <p className="text-xs font-semibold text-brand-secondary">Step {step}</p>
                <p className="mt-1 text-lg font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/60">{copy}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BIAS ANALYSIS DASHBOARD ───────────────────────────────────────────── */}
      <section id="analysis" className="py-16 px-4">
        <BiasAnalysisDashboard />
      </section>
    </div>
  );
}