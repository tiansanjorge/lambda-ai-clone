import { useState, useEffect, useRef } from "react";
import WebGLPipeline from "../lib/WebGLPipeline";

// ── Constants ────────────────────────────────────────────────────────────────

const LOOP_DURATION = 11000;
const PHASE_DURATION = 1000;

// Staggered start delay per character within a 11s loop
const CHAR_CONFIG = [
  { key: "U", delay: 1000 }, // 'u' in Superintelligence
  { key: "E", delay: 4500 }, // 'e' in intelligEnce (index 13 of "Superintelligence")
  { key: "O", delay: 7500 }, // 'o' in Cloud
];

// Fixed-width container prevents layout shift across all phases.
// Outer dimensions (0.6em × 1em) never change — overflow always hidden.
// RGB aberration applied via text-shadow on the inner visible span in both pixel phases.
function AnimChar({ char, phase }) {
  const outerStyle = {
    position: "relative",
    display: "inline-block",
    width: "0.6em",
    height: "1em",
    verticalAlign: "bottom",
    overflow: "hidden",
  };

  let visibleStyle;
  if (phase === "pixel") {
    visibleStyle = {
      fontFamily: "var(--font-pixel)",
      fontSize: "inherit",
      lineHeight: "1",
      fontWeight: "300",
      transform: "scale(0.98)",
      transformOrigin: "50% 100%",
      backgroundColor: "var(--color-background-light)",
      mixBlendMode: "screen",
      color: "rgb(0,0,0)",
      textShadow: "var(--text-shadow-rgb)",
    };
  } else if (phase === "pixel-no-highlight") {
    visibleStyle = {
      fontFamily: "var(--font-pixel)",
      fontSize: "inherit",
      lineHeight: "1",
      fontWeight: "300",
      transform: "scale(0.98)",
      transformOrigin: "50% 100%",
      color: "inherit",
      textShadow: "var(--text-shadow-rgb)",
      maxWidth: "100%",
      overflow: "hidden",
    };
  } else {
    visibleStyle = {
      fontFamily: "var(--font-sans)",
    };
  }

  return (
    <span style={outerStyle}>
      {/* Preloader — keeps pixel font glyph metrics in memory without affecting layout */}
      <span
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          fontFamily: "var(--font-pixel)",
        }}
      >
        {char}
      </span>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...visibleStyle,
        }}
      >
        {char}
      </span>
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HeroSection() {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const timeoutIds = useRef([]);
  const intervalId = useRef(null);

  const [phases, setPhases] = useState({
    U: "pixel-no-highlight",
    E: "pixel-no-highlight",
    O: "pixel-no-highlight",
  });

  // ── Canvas background animation (WebGL) ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 1800 * dpr;
    canvas.height = 800 * dpr;

    let pipeline;
    try {
      pipeline = new WebGLPipeline(canvas);
    } catch (e) {
      console.error("WebGLPipeline failed:", e);
      return;
    }

    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    function onMouseMove(e) {
      const rect = section.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
    }
    section.addEventListener("mousemove", onMouseMove);

    const startTime = performance.now();
    let rafId;

    function draw() {
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;
      const t = (performance.now() - startTime) / 1000;
      pipeline.render(t, mouse.x, mouse.y);
      rafId = requestAnimationFrame(draw);
    }

    draw();

    setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.opacity = "1";
    }, 1000);

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener("mousemove", onMouseMove);
      pipeline.destroy();
    };
  }, []);

  // ── Font-swap animation ───────────────────────────────────────────────────
  useEffect(() => {
    function scheduleChar(key, delay) {
      timeoutIds.current.push(
        setTimeout(() => setPhases((p) => ({ ...p, [key]: "pixel" })), delay),
      );
      timeoutIds.current.push(
        setTimeout(
          () => setPhases((p) => ({ ...p, [key]: "pixel-no-highlight" })),
          delay + PHASE_DURATION,
        ),
      );
      timeoutIds.current.push(
        setTimeout(
          () => setPhases((p) => ({ ...p, [key]: "none" })),
          delay + PHASE_DURATION * 2,
        ),
      );
    }

    function scheduleLoop() {
      for (const { key, delay } of CHAR_CONFIG) {
        scheduleChar(key, delay);
      }
    }

    // Wait for pixel font before starting — prevents FOUT on first cycle
    Promise.all([
      document.fonts.load("1em apkarchivr21"),
      document.fonts.ready,
    ]).then(() => {
      const _o1 = Math.floor(Math.random() * 12) + 140;
      const _o2 = Math.floor(Math.random() * 12) + 140;
      const _shuffled = ["U", "E", "O"].sort(() => Math.random() - 0.5);
      timeoutIds.current.push(
        setTimeout(
          () => setPhases((p) => ({ ...p, [_shuffled[0]]: "pixel" })),
          500,
        ),
      );
      timeoutIds.current.push(
        setTimeout(
          () => setPhases((p) => ({ ...p, [_shuffled[1]]: "pixel" })),
          500 + _o1,
        ),
      );
      timeoutIds.current.push(
        setTimeout(
          () => setPhases((p) => ({ ...p, [_shuffled[2]]: "pixel" })),
          500 + _o1 + _o2,
        ),
      );
      timeoutIds.current.push(
        setTimeout(() => {
          scheduleLoop();

          intervalId.current = setInterval(() => {
            timeoutIds.current.forEach(clearTimeout);
            timeoutIds.current = [];
            scheduleLoop();
          }, LOOP_DURATION);
        }, 1500),
      );
    });

    return () => {
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current = [];
      clearInterval(intervalId.current);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="pt-xl pb-xl _homeHero_m4xpb_1 module-comp"
      id="section-home-hero"
    >
      {/* Background animation */}
      <div aria-hidden="true">
        <div className="_backgroundAnimation_15jea_2 hero-bg">
          <div
            style={{ width: "100%", height: "100%" }}
            className="_animationContainer_15jea_14 _fadeIn_15jea_37"
          >
            <canvas
              ref={canvasRef}
              style={{ opacity: 0, transition: "opacity 0.7s ease-in" }}
            />
          </div>
        </div>
      </div>

      {/* Eyebrow */}
      <p className="_eyebrow_m4xpb_37">
        Supercomputers for training and inference
      </p>

      {/* Reduced-motion static fallback */}
      <h1 className="h1-large _reducedMotionTitle_m4xpb_75">
        <span>
          The Superintelligence <br /> Cloud
        </span>
      </h1>

      {/* Animated heading
          "Superintelligence" split: S | u(U) | perintellig | e(E) | nce
          "Cloud" split:             Cl | o(O) | ud                        */}
      <h1 className="h1-large _heroTitle_m4xpb_78">
        <span className="sr-only">The Superintelligence Cloud</span>
        <span aria-hidden="true">
          {"The "}
          <span className="no-wrap">
            {"S"}
            <AnimChar char="u" phase={phases.U} />
            {"perintellig"}
            <AnimChar char="e" phase={phases.E} />
            {"nce"}
          </span>
          <br />
          {"Cl"}
          <AnimChar char="o" phase={phases.O} />
          {"ud"}
        </span>
      </h1>

      {/* CTA buttons */}
      <div className="container _titleContainer_m4xpb_58">
        <div className="buttonGroup _buttonGroup_m4xpb_63" data-align="center">
          <a
            href="#top"
            className="button"
            aria-label="Launch GPU instance"
          >
            Launch GPU instance
          </a>
          <a
            href="#top"
            className="button button--secondary"
            aria-label="Talk to our team"
          >
            Talk to our team
          </a>
        </div>
      </div>
    </section>
  );
}
