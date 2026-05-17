import { useState, useEffect, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const LOOP_DURATION = 10000;
const PHASE_DURATION = 1000;

// Staggered start delay per character within a 10s loop
const CHAR_CONFIG = [
  { key: "U", delay: 0 }, // 'u' in Superintelligence
  { key: "E", delay: 3500 }, // 'e' in intelligEnce (index 13 of "Superintelligence")
  { key: "O", delay: 6500 }, // 'o' in Cloud
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

  const [phases, setPhases] = useState({ U: "pixel", E: "pixel", O: "pixel" });

  // ── Canvas background animation (WebGL) ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1800;
    canvas.height = 800;

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return;

    // --- Vertex shader ---
    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // --- Fragment shader ---
    // Replicates: wisps (voronoi streaks in ultraviolet) + vignette + chromatic aberration
    const fsSource = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;

      const float PI = 3.14159265359;

      mat2 rot(float a) {
        return mat2(cos(a), -sin(a), sin(a), cos(a));
      }

      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      // Voronoi additive — same logic as original wisps shader
      float voronoi(vec2 st, float radius) {
        vec2 i_st = floor(st);
        vec2 f_st = fract(st);
        float total = 0.0;

        for (int y = -2; y <= 2; y++) {
          for (int x = -2; x <= 2; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cell_id = i_st + neighbor;
            vec2 point = hash(cell_id);
            // Animate point position
            point = 0.5 + 0.5 * sin(5.0 + uTime * 0.04 * 0.2 + 6.2831 * point);
            vec2 diff = (cell_id + point) - st;
            float dist = length(diff);
            float contribution = radius / max(dist, radius * 0.1);
            // Shimmer
            float shimmer_phase = dot(point, vec2(1.0)) * 10.0 + hash(cell_id).x * 5.0 + uTime * 0.04 * 0.5;
            float shimmer = mix(1.0, (sin(shimmer_phase) + 1.0), 0.93);
            contribution *= shimmer;
            total += mix(contribution * contribution, contribution * 2.0, 0.08);
          }
        }
        return total;
      }

      vec2 cylindricalUV(vec2 uv, vec2 mouse) {
        // Map flat UV to spherical/cylindrical projection — replicates lambda.ai projection layer
        vec2 screenPos = (uv - 0.5) * 2.0;
        screenPos.x *= 2.0; // aspect compensation (canvas is ~2:1)
        screenPos.y *= -1.0;

        float fov = mix(radians(20.0), radians(120.0), 0.75);

        // Ray direction
        vec3 rayDir = normalize(vec3(
          screenPos.x * tan(fov / 2.0),
          screenPos.y * tan(fov / 2.0),
          -1.0
        ));

        // Longitude/latitude -> UV (horizontal wrap)
        float longitude = atan(rayDir.z, rayDir.x);
        float latitude  = acos(clamp(rayDir.y, -0.999, 0.999));

        vec2 sphereUV;
        sphereUV.x = longitude / (2.0 * PI) + 0.5 + 0.25;
        sphereUV.y = latitude / PI;

        // Scale compensation (from original: mix(-0.1, 0.4, 0.29) * 12 + 2)
        float fovComp = tan(fov / 2.0);
        float scale = (mix(-0.1, 0.4, 0.29) * 12.0 + 2.0) / fovComp;
        sphereUV = (sphereUV - 0.5) * scale + 0.5;

        sphereUV.y = clamp(sphereUV.y, 0.0, 1.0);
        return vec2(fract(sphereUV.x), sphereUV.y);
      }

      void main() {
        vec2 uv = cylindricalUV(vUv, uMouse);
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

        // --- Background: #0B0B0B ---
        vec3 color = vec3(0.04314);

        // --- Wisps ---
        // Rotation: 0.2511 * 2PI (from original shader)
        float rotAngle = 0.2511 * 2.0 * PI;
        // Compress heavily on Y axis (vec2(1, 0) mix at 0.97 = nearly flat)
        vec2 skew = vec2(1.0, 0.03);

        vec2 st = uv - vec2(0.5, 0.5);
        st *= aspect;
        st = rot(rotAngle) * st;
        st *= 40.0 * 0.928;
        st *= skew;

        // Two passes at different scales (same as original pass1 + pass2)
        // Scroll in wisp-space — periodic by nature, no seam
        float scrollX = uTime * 0.005 * 0.5 * 40.0 * 0.928;
        vec2 scrollOffset = vec2(0.0, uTime * 0.04 * 0.5 * -0.05);
        vec2 st1 = st + vec2(scrollX, 0.0) + scrollOffset * 38.0 * 0.928;
        vec2 st2 = st + vec2(scrollX, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;

        float pass1 = voronoi(st1 * aspect, 0.5 * 0.38) * 0.02;
        float pass2 = voronoi(st2 * aspect, 0.5 * 0.38) * 0.04;

        // Ultraviolet color: rgb(161, 134, 248) -> vec3(0.631, 0.525, 0.973)
        vec3 wispColor = vec3(0.631, 0.525, 0.973);
        color += (pass1 + pass2) * wispColor;
        color = clamp(color, 0.0, 1.0);

        // Soft glow — brighten the band center subtly
        float glowDist = abs(vUv.y - 0.5);
        float glow = smoothstep(0.35, 0.0, glowDist) * 0.15;
        color += vec3(0.12, 0.10, 0.22) * glow;
        color = clamp(color, 0.0, 1.0);

        // --- Chromatic aberration (rotating, factor 0.692 from original) ---
        float angle = (0.2592 + uTime * 0.04 * 0.05) * 360.0 * PI / 180.0;
        vec2 rotation = vec2(sin(angle), cos(angle));
        vec2 aberrated = 0.692 * rotation * 0.03 * distance(uv, vec2(0.5));
        if (length(aberrated) > 0.001) {
          // Shift R channel left, B channel right
          // Re-compute wisps at offset UVs for R and B channels
          vec2 uvR = cylindricalUV(vUv - aberrated, uMouse);
          vec2 uvB = cylindricalUV(vUv + aberrated, uMouse);

          // R channel from offset
          vec2 stR = uvR - vec2(0.5);
          stR *= aspect;
          stR = rot(rotAngle) * stR;
          stR *= 40.0 * 0.928;
          stR *= skew;
          vec2 st1R = stR + vec2(scrollX, 0.0) + scrollOffset * 38.0 * 0.928;
          vec2 st2R = stR + vec2(scrollX, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
          float p1R = voronoi(st1R, 0.5 * 0.38) * 0.02;
          float p2R = voronoi(st2R, 0.5 * 0.38) * 0.04;
          float wispR = (p1R + p2R) * wispColor.r + 0.04314;

          // B channel from offset
          vec2 stB = uvB - vec2(0.5);
          stB *= aspect;
          stB = rot(rotAngle) * stB;
          stB *= 40.0 * 0.928;
          stB *= skew;
          vec2 st1B = stB + vec2(scrollX, 0.0) + scrollOffset * 38.0 * 0.928;
          vec2 st2B = stB + vec2(scrollX, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
          float p1B = voronoi(st1B, 0.5 * 0.38) * 0.02;
          float p2B = voronoi(st2B, 0.5 * 0.38) * 0.04;
          float wispB = (p1B + p2B) * wispColor.b + 0.04314;

          color.r = wispR;
          color.b = wispB;
        }

        // --- Vertical band mask (applied last, after all effects) ---
        float bandCenter = 0.5 - (uMouse.y - 0.5) * 0.18;
        bandCenter += 0.06;
        bandCenter = clamp(bandCenter, 0.38, 0.72);
        float distFromCenter = abs(vUv.y - bandCenter);
        float bandMask = 1.0 - smoothstep(0.12, 0.28, distFromCenter);
        bandMask = pow(bandMask, 1.8);
        color = mix(vec3(0.0), color, bandMask);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Fullscreen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uRes = gl.getUniformLocation(program, "uResolution");

    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    function onMouseMove(e) {
      const rect = sectionRef.current.getBoundingClientRect();
      targetMouse.x = (e.clientX - rect.left) / rect.width;
      targetMouse.y = (e.clientY - rect.top) / rect.height;
    }
    sectionRef.current.addEventListener("mousemove", onMouseMove);

    const startTime = performance.now();
    let rafId;

    function draw() {
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      const t = (performance.now() - startTime) / 1000;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(rafId);
      sectionRef.current?.removeEventListener("mousemove", onMouseMove);
      gl.deleteProgram(program);
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
      scheduleLoop();

      intervalId.current = setInterval(() => {
        timeoutIds.current.forEach(clearTimeout);
        timeoutIds.current = [];
        scheduleLoop();
      }, LOOP_DURATION);
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
            <canvas ref={canvasRef} />
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
            href="/sign-up"
            className="button"
            aria-label="Launch GPU instance"
          >
            Launch GPU instance
          </a>
          <a
            href="/talk-to-our-team"
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
