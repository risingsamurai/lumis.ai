import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useRef } from "react";

import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { firebaseEnabled } from "../services/firebase";
import { BiasAnalysisDashboard } from "../components/BiasAnalysisDashboard";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      delay: i * 0.1,
    },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const { signInWithGoogle, user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "mousemove",
          x: e.clientX,
          y: e.clientY,
        },
        "*"
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-bg text-white">
      {/* SDG Banner */}
      <div
        className="sticky top-0 z-50"
        style={{ background: "linear-gradient(to right, #1a1a2e, #16213e)" }}
      >
        <div className="flex items-center justify-center px-4 py-2 text-xs text-white/70">
          LUMIS.AI addresses UN SDG 10 — Reduced Inequalities
        </div>
      </div>

      {/* HERO */}
      <section
        className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden px-4 pb-20 text-center"
        onMouseMove={handleMouseMove}
      >
        {/* Robot Background */}
        <div className="absolute inset-0 z-0">
          <iframe
            ref={iframeRef}
            src="/robot.html"
            id="robot-iframe"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: "none",
              background: "transparent",
            }}
            allowTransparency={true}
            scrolling="no"
          />

          {/* Clean overlay only */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/40 via-brand-bg/20 to-brand-bg" />
        </div>

        {/* Title */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="relative z-10 mt-80 text-4xl md:text-6xl font-light tracking-tight text-white"
        >
          LUMIS
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="relative z-10 mt-8 max-w-2xl text-lg md:text-xl font-light leading-relaxed tracking-tight text-white/50"
        >
          LUMIS.AI helps teams proactively detect and mitigate unfair outcomes
          in AI models — before they reach production.
        </motion.p>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          {user ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex h-12 items-center justify-center border border-white/20 bg-white/10 px-8 text-sm font-medium uppercase tracking-[0.15em] text-white backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20"
            >
              Dashboard Access
            </button>
          ) : (
            <button
              onClick={() => {
                if (!firebaseEnabled) {
                  toast("Add Firebase env vars to enable Google Sign-In.");
                  return;
                }
                void signInWithGoogle();
              }}
              className="flex h-12 items-center justify-center border border-white/20 bg-white/10 px-8 text-sm font-medium uppercase tracking-[0.15em] text-white backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20"
            >
              Sign in with Google
            </button>
          )}

          <button
            onClick={() => {
              document.getElementById("analysis")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex h-12 items-center justify-center border border-transparent px-8 text-sm font-medium uppercase tracking-[0.15em] text-white/60 transition-all hover:bg-white/5 hover:text-white"
          >
            Try Demo
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
        >
          <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-1.5 w-1 rounded-full bg-white/50"
            />
          </div>
        </motion.div>
      </section>

      {/* LUMIS ENTERPRISE ARCHITECTURE */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-20 text-5xl font-light tracking-tight text-white"
        >
          LUMIS Intelligence Layer
        </motion.h2>

        <div className="space-y-0 border-t border-white/10">
          {[
            {
              index: "/0.1",
              title: "Bias Detection Engine",
              description:
                "Detect unfair outcomes across protected attributes before deployment.",
              metric: "2.4B+",
            },
            {
              index: "/0.2",
              title: "Fairness Audit Layer",
              description:
                "73% of HR teams use AI without fairness audits — we close that gap.",
              metric: "73%",
            },
            {
              index: "/0.3",
              title: "Governance Infrastructure",
              description:
                "94% of organizations lack AI fairness governance frameworks.",
              metric: "94%",
            },
            {
              index: "/0.4",
              title: "Mitigation Pipeline",
              description:
                "Generate guided bias remediation strategies 3× faster.",
              metric: "3×",
            },
            {
              index: "/0.5",
              title: "SDG 10 Alignment",
              description:
                "Reduced inequalities through measurable responsible AI systems.",
              metric: "SDG 10",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i * 0.15}
              className="group border-b border-white/10 py-12 transition-all duration-300 hover:bg-white/[0.02]"
            >
              <div className="grid items-end gap-8 md:grid-cols-[180px_1fr_auto]">
                <div className="text-sm text-white/30">{item.index}</div>

                <div>
                  <h3 className="text-2xl font-medium tracking-tight text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 max-w-xl text-base leading-relaxed text-white/50">
                    {item.description}
                  </p>
                </div>

                <div className="text-right text-6xl font-light tracking-tight text-white/10 md:text-8xl">
                  {item.metric}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bias Analysis Dashboard */}
      <section id="analysis" className="px-4 py-16">
        <BiasAnalysisDashboard />
      </section>
    </div>
  );
}