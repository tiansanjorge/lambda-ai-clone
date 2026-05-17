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

      float nebula(vec2 p, float t) {
        float val = 0.0;

        vec2 q1 = (p + vec2(t * 0.0012, t * 0.0008)) * 2.5;
        vec2 i1 = floor(q1); vec2 f1 = fract(q1);
        vec2 u1 = f1 * f1 * (3.0 - 2.0 * f1);
        val += mix(mix(hash(i1).x, hash(i1 + vec2(1.0, 0.0)).x, u1.x),
                   mix(hash(i1 + vec2(0.0, 1.0)).x, hash(i1 + vec2(1.0, 1.0)).x, u1.x), u1.y) * 0.5;

        vec2 q2 = (p + vec2(t * -0.0009, t * 0.0006)) * 5.0;
        vec2 i2 = floor(q2); vec2 f2 = fract(q2);
        vec2 u2 = f2 * f2 * (3.0 - 2.0 * f2);
        val += mix(mix(hash(i2).x, hash(i2 + vec2(1.0, 0.0)).x, u2.x),
                   mix(hash(i2 + vec2(0.0, 1.0)).x, hash(i2 + vec2(1.0, 1.0)).x, u2.x), u2.y) * 0.3;

        vec2 q3 = (p + vec2(t * 0.0014, t * -0.0007)) * 10.0;
        vec2 i3 = floor(q3); vec2 f3 = fract(q3);
        vec2 u3 = f3 * f3 * (3.0 - 2.0 * f3);
        val += mix(mix(hash(i3).x, hash(i3 + vec2(1.0, 0.0)).x, u3.x),
                   mix(hash(i3 + vec2(0.0, 1.0)).x, hash(i3 + vec2(1.0, 1.0)).x, u3.x), u3.y) * 0.2;

        return val * 0.5 + 0.5;
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
        float rotAngle = 0.2511 * 2.0 * PI;
        vec2 skew = vec2(1.0, 0.03);

        vec2 st = uv - vec2(0.5, 0.5);
        st *= aspect;
        st = rot(rotAngle) * st;
        st *= 40.0 * 0.928;
        st *= skew;

        float scrollX = -uTime * 0.003 * 0.5 * 40.0 * 0.928;
        vec2 scrollOffset = vec2(0.0, uTime * 0.04 * 0.5 * -0.05);

        vec3 finalWisps = vec3(0.0);

        // Each pass offset spatially → different voronoi cells → different lines
        // Color per pass: muted spectrum, dark and desaturated
        vec2 s1 = st + vec2(scrollX + 0.0,  0.0) + scrollOffset * 38.0 * 0.928;
        vec2 s2 = st + vec2(scrollX + 0.0,  0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
        float pA = voronoi(s1 * aspect, 0.5 * 0.38) * 0.001 + voronoi(s2 * aspect, 0.5 * 0.38) * 0.06;
        finalWisps += pA * vec3(0.15, 0.20, 0.55); // deep blue
        

        vec2 s3 = st + vec2(scrollX + 7.0,  0.0) + scrollOffset * 38.0 * 0.928;
        vec2 s4 = st + vec2(scrollX + 7.0,  0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
        float pB = voronoi(s3 * aspect, 0.5 * 0.38) * 0.001 + voronoi(s4 * aspect, 0.5 * 0.38) * 0.06;
        finalWisps += pB * vec3(0.35, 0.15, 0.60); // violet

        vec2 s5 = st + vec2(scrollX + 14.0, 0.0) + scrollOffset * 38.0 * 0.928;
        vec2 s6 = st + vec2(scrollX + 14.0, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
        float pC = voronoi(s5 * aspect, 0.5 * 0.38) * 0.001 + voronoi(s6 * aspect, 0.5 * 0.38) * 0.06;
        finalWisps += pC * vec3(0.55, 0.12, 0.35); // magenta

        vec2 s7 = st + vec2(scrollX + 21.0, 0.0) + scrollOffset * 38.0 * 0.928;
        vec2 s8 = st + vec2(scrollX + 21.0, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
        float pD = voronoi(s7 * aspect, 0.5 * 0.38) * 0.001 + voronoi(s8 * aspect, 0.5 * 0.38) * 0.06;
        finalWisps += pD * vec3(0.12, 0.15, 0.45); // indigo

        vec2 s9  = st + vec2(scrollX + 28.0, 0.0) + scrollOffset * 38.0 * 0.928;
        vec2 s10 = st + vec2(scrollX + 28.0, 0.0) + vec2(10.0) + scrollOffset * 48.0 * 0.928;
        float pE = voronoi(s9  * aspect, 0.5 * 0.38) * 0.001 + voronoi(s10 * aspect, 0.5 * 0.38) * 0.06;
        finalWisps += pE * vec3(0.10, 0.30, 0.50); // cyan/teal

        float nebulaVal = nebula(vUv * vec2(3.0, 2.5), uTime);
        float breathe = sin(uTime * 0.22) * 0.07;
        float nebulaMask = smoothstep(0.35 + breathe, 0.70 + breathe, nebulaVal);
        float wispVisibility = mix(0.03, 1.0, nebulaMask); 
        color += finalWisps * wispVisibility;
        color = clamp(color, 0.0, 1.0);

        // Soft glow — brighten the band center subtly
        float glowDist = abs(vUv.y - 0.5);
        float glow = smoothstep(0.35, 0.0, glowDist) * 0.15;
        color += vec3(0.12, 0.10, 0.22) * glow;
        color = clamp(color, 0.0, 1.0);

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
