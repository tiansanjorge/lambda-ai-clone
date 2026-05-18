// ── Shader sources ────────────────────────────────────────────────────────────

const VS = `#version 300 es
precision mediump float;
in vec3 aVertexPosition;
in vec2 aTextureCoord;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;
out vec2 vTextureCoord;
out vec3 vVertexPosition;
void main() {
  gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
  vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
  vVertexPosition = aVertexPosition;
}`;

const GRADIENT_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform vec2 uMousePos;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.04314, 0.04314, 0.04314, 1.0);
}`;

const WISPS_FS = `#version 300 es
precision highp float;
in vec3 vVertexPosition;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;
out vec4 fragColor;

const float PI = 3.14159265359;

mat2 rot(float a) {
  return mat2(cos(a), -sin(a), sin(a), cos(a));
}

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float voronoi_additive(vec2 st, float radius, vec2 mouse_pos, float scale) {
  vec2 i_st = floor(st);
  float wander = 0.0;
  float total_contribution = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cell_id = i_st + neighbor;
      vec2 point = hash(cell_id);
      point = 0.5 + 0.5 * sin(5.0 + wander + 6.2831 * point);
      vec2 starAbsPos = cell_id + point;
      vec2 dirToMouse = mouse_pos - starAbsPos;
      float attractStrength = 0.0;
      starAbsPos += dirToMouse * attractStrength;
      vec2 diff = starAbsPos - st;
      float dist = length(diff);
      float contribution = radius / max(dist, radius * 0.1);
      float shimmer_phase = dot(point, vec2(1.0)) * 10.0 + hash(cell_id).x * 5.0 + uTime * 0.08;
      float shimmer = mix(1.0, (sin(shimmer_phase) + 1.0), 0.93);
      contribution *= shimmer;
      total_contribution += mix(contribution * contribution, contribution * 2.0, 0.08);
    }
  }
  return total_contribution;
}

void main() {
  vec2 uv = vTextureCoord;
  vec4 bg = texture(uTexture, uv);
  vec4 color = vec4(0.0);
  vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 mPos = vec2(0.0);

  uv -= vec2(0.5, 0.5);
  uv *= aspectRatio;
  uv = uv * rot(0.2511 * 2.0 * PI);
  uv *= 40.0 * 0.9280;
  uv *= mix(vec2(1.0), vec2(1.0, 0.0), 0.97);
  uv /= aspectRatio;

  vec2 mouseGrid = vec2(0.0);
  vec2 movementOffset = vec2(0.0, uTime * 0.5 * -0.05);

  vec2 mouseGrid1 = mouseGrid - (mPos * 38.0 * 0.9280) + movementOffset;
  vec2 mouseGrid2 = mouseGrid - (mPos * 48.0 * 0.9280) + movementOffset;

  vec2 st1 = uv - (mPos * 38.0 * 0.9280);
  vec2 st2 = uv - (mPos * 48.0 * 0.9280);

  vec2 mouse1 = st1 + movementOffset;
  vec2 mouse2 = st2 + movementOffset;

  float radius1 = 0.5 * 0.38;
  float radius2 = 0.5 * 0.38;

  float pass1 = voronoi_additive(mouse1 * aspectRatio, radius1, mouseGrid1 * aspectRatio, 38.0 * 0.9280);
  float pass2 = voronoi_additive(mouse2 * aspectRatio + vec2(10.0), radius2, mouseGrid2 * aspectRatio + vec2(10.0), 48.0 * 0.9280);

  pass1 *= 0.02;
  pass2 *= 0.04;

  color.rgb = (pass1 + pass2) * vec3(0.6313725, 0.5254902, 0.9725490) * mix(1.0, bg.r, 0.20);
  color.rgb = clamp(color.rgb, 0.0, 1.0);
  color.rgb = bg.rgb + color.rgb;
  color = vec4(color.rgb, max(bg.a, luma(color.rgb)));
  fragColor = color;
}`;

const PASSTHROUGH_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
out vec4 fragColor;
void main() {
  fragColor = texture(uTexture, vTextureCoord);
}`;

const VIGNETTE_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform vec2 uMousePos;
uniform vec2 uResolution;
out vec4 fragColor;
void main() {
  vec2 uv = vTextureCoord;
  vec4 color = texture(uTexture, uv);
  vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 skew = vec2(0.0, 1.0);
  float halfRadius = 0.44 * 0.5;
  float innerEdge = halfRadius - 1.0 * halfRadius * 0.5;
  float outerEdge = halfRadius + 1.0 * halfRadius * 0.5;
  vec2 pos = vec2(0.5, 0.5);
  pos += (uMousePos - 0.5) * 0.28;
  vec2 scaledUV  = uv  * aspectRatio * skew;
  vec2 scaledPos = pos * aspectRatio * skew;
  float radius = distance(scaledUV, scaledPos);
  float falloff = smoothstep(innerEdge, outerEdge, radius);
  vec3 vigColor = vec3(0.04314);
  vec3 finalColor = mix(color.rgb, mix(color.rgb, vigColor, 1.0), falloff);
  color = mix(color * (1.0 - falloff), vec4(finalColor * color.a, color.a), 1.0);
  fragColor = color;
}`;

const CHROMAB_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;
out vec4 fragColor;
const float PI = 3.1415926;
vec3 getAberratedColor(vec3 color, vec3 left, vec3 center, vec3 right) {
  return vec3(left.r, color.g, right.b);
}
void main() {
  vec2 uv = vTextureCoord;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 pos = vec2(0.5, 0.5);
  float angle = ((0.2592 + uTime * 0.05) * 360.0) * PI / 180.0;
  vec2 rotation = vec2(sin(angle), cos(angle));
  vec4 color = texture(uTexture, uv);
  float mDist = 1.0;
  vec2 aberrated = 0.6920 * rotation * 0.03;
  aberrated *= mDist;
  float amt = length(aberrated);
  if (amt < 0.001) {
    fragColor = color;
    return;
  }
  vec4 left   = texture(uTexture, uv - aberrated);
  vec4 right  = texture(uTexture, uv + aberrated);
  vec4 center = vec4(0.0);
  color.rgb = getAberratedColor(color.rgb, left.rgb, center.rgb, right.rgb);
  color.a = max(max(left.a, center.a), right.a);
  fragColor = color;
}`;

const VORONOI_FBM_FS = `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
uniform vec2 uResolution;
out vec4 fragColor;
const float PI = 3.14159265359;
mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
vec2 random2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
vec2 voronoidNoise(vec2 st) {
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);
  float m_dist = 15.0;
  vec2 m_point = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 point = random2(i_st + neighbor);
      point = 0.5 + 0.5 * sin(5.0 + uTime * 0.02 + 6.2831 * point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      if (dist < m_dist) {
        m_dist = dist;
        m_point = point;
      }
    }
  }
  return m_point;
}
vec2 voronoiFBM(vec2 st) {
  vec2 value = vec2(0.0);
  vec2 shift = vec2(100.0);
  float xp = sqrt(2.0);
  mat2 r = rot(0.5);
  for (int i = 0; i < 8; i++) {
    value += voronoidNoise(st);
    st = st * xp + shift;
    st = r * st;
  }
  return value / 8.0;
}
void main() {
  vec2 uv = vTextureCoord;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 skew = vec2(1.0, 0.0);
  vec2 st = (uv - vec2(0.5, 0.5009487666034156)) * vec2(aspectRatio, 1.0) * 50.0 * 0.8;
  st = st * rot(0.2511 * 2.0 * PI) * mat2(skew.x, 0.0, 0.0, skew.y);
  vec2 m_point = voronoiFBM(st);
  vec2 offset = (m_point * 0.2 * 0.7 * 2.0) - (0.7 * 0.2);
  float dist = 1.0;
  vec4 color = texture(uTexture, uv + offset * dist);
  fragColor = color;
}`;

const BLOOM_THRESHOLD_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
out vec4 fragColor;
float luma(vec4 color) { return dot(color.rgb, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec2 uv = vTextureCoord;
  vec4 color = texture(uTexture, uv);
  color.rgb = pow(color.rgb, vec3(1.0/2.2));
  color.rgb = 1.2 * (color.rgb - 0.5) + 0.5;
  vec4 bloom = color * smoothstep(0.45 - 0.1, 0.45, luma(color));
  fragColor = vec4(bloom.rgb, color.a);
}`;

const BLOOM_BLUR_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uDirection;
out vec4 fragColor;
float w[9];
void main() {
  w[0]=1.0; w[1]=0.7165313106; w[2]=0.5134171190;
  w[3]=0.3678794412; w[4]=0.2636050919; w[5]=0.1888756057;
  w[6]=0.1353352832; w[7]=0.0969670595; w[8]=0.0694877157;
  vec4 color = vec4(0.0);
  float total_weight = 0.0;
  vec4 center = texture(uTexture, vTextureCoord);
  color += center * w[0];
  total_weight += w[0];
  for (int i = 1; i <= 8; i++) {
    float weight = w[i];
    vec2 offset = uDirection * float(i);
    vec4 s1 = texture(uTexture, vTextureCoord + offset);
    vec4 s2 = texture(uTexture, vTextureCoord - offset);
    color += (s1 + s2) * weight;
    total_weight += 2.0 * weight;
  }
  fragColor = color / total_weight;
}`;

const BLOOM_BLUR_COMBINE_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform sampler2D uBgTexture;
uniform vec2 uResolution;
uniform vec2 uDirection;
out vec4 fragColor;
float luma(vec4 color) { return dot(color.rgb, vec3(0.299, 0.587, 0.114)); }
float w[9];
void main() {
  w[0]=1.0; w[1]=0.7165313106; w[2]=0.5134171190;
  w[3]=0.3678794412; w[4]=0.2636050919; w[5]=0.1888756057;
  w[6]=0.1353352832; w[7]=0.0969670595; w[8]=0.0694877157;
  vec4 color = vec4(0.0);
  float total_weight = 0.0;
  vec4 center = texture(uTexture, vTextureCoord);
  color += center * w[0];
  total_weight += w[0];
  for (int i = 1; i <= 8; i++) {
    float weight = w[i];
    vec2 offset = uDirection * float(i);
    vec4 s1 = texture(uTexture, vTextureCoord + offset);
    vec4 s2 = texture(uTexture, vTextureCoord - offset);
    color += (s1 + s2) * weight;
    total_weight += 2.0 * weight;
  }
  color = color / total_weight;
  vec4 bg = texture(uBgTexture, vTextureCoord);
  bg.rgb = pow(bg.rgb, vec3(1.0/2.2));
  bg.rgb = 1.2 * (bg.rgb - 0.5) + 0.5;
  vec4 bgBloom = bg * smoothstep(0.45 - 0.1, 0.45, luma(bg));
  fragColor = bgBloom * 0.5 + color * 1.25;
}`;

const BLOOM_FINAL_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform sampler2D uBgTexture;
out vec4 fragColor;
float luma(vec4 color) { return dot(color.rgb, vec3(0.299, 0.587, 0.114)); }
uvec2 pcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.y * 1664525u + 1013904223u;
  v.y += v.x * v.x * 1664525u + 1013904223u;
  v ^= v >> 16u;
  v.x += v.y * v.y * 1664525u + 1013904223u;
  v.y += v.x * v.x * 1664525u + 1013904223u;
  return v;
}
float randFibo(vec2 p) {
  uvec2 v = floatBitsToUint(p);
  v = pcg2d(v);
  uint r = v.x ^ v.y;
  return float(r) / float(0xffffffffu);
}
void main() {
  vec4 bloomColor = texture(uTexture, vTextureCoord);
  float dither = (randFibo(gl_FragCoord.xy) - 0.5) / 255.0;
  bloomColor.rgb += dither;
  bloomColor.a = luma(bloomColor);
  vec4 sceneColor = texture(uBgTexture, vTextureCoord);
  fragColor = mix(sceneColor, sceneColor + bloomColor, 0.55 * 2.2);
}`;

const PROJECTION_FS = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMousePos;
out vec4 fragColor;
const float PI = 3.14159265;
vec3 getRayDirection(vec2 uv, vec2 mousePos, float aspect) {
  vec2 screenPos = (uv - 0.5) * 2.0;
  screenPos.x *= aspect;
  screenPos.y *= -1.0;
  float fov = mix(radians(20.0), radians(120.0), 0.75);
  vec3 rayDir = normalize(vec3(
    screenPos.x * tan(fov / 2.0),
    screenPos.y * tan(fov / 2.0),
    -1.0
  ));
  float rotX = (mousePos.y - 0.5) * PI;
  float rotY = (mousePos.x - 0.5) * PI * 2.0;
  mat3 rotateY = mat3(
    cos(rotY), 0.0, -sin(rotY),
    0.0,       1.0,  0.0,
    sin(rotY), 0.0,  cos(rotY)
  );
  mat3 rotateX = mat3(
    1.0,  0.0,        0.0,
    0.0,  cos(rotX),  sin(rotX),
    0.0, -sin(rotX),  cos(rotX)
  );
  return normalize(rotateX * rotateY * rayDir);
}
vec2 directionToUVHorizontal(vec3 dir) {
  float longitude = atan(dir.z, dir.x);
  float latitude  = acos(clamp(dir.y, -1.0, 1.0));
  vec2 uv;
  uv.x = longitude / (2.0 * PI) + 0.5 + 0.25;
  uv.y = latitude / PI;
  return uv;
}
void main() {
  float aspect = 2.0;
  vec2 mPos = vec2(0.5, 0.60);
  vec3 rayDir = getRayDirection(vTextureCoord, mPos, aspect);
  vec2 sphereUV = directionToUVHorizontal(rayDir);
  float fov = mix(radians(20.0), radians(120.0), 0.75);
  float fovComp = tan(fov / 2.0);
  float compensatedScale = (mix(-0.1, 0.4, 0.29) * 12.0 + 2.0) / fovComp;
  sphereUV = (sphereUV - 0.5) * compensatedScale + 0.5;
  sphereUV.x -= uTime * 0.005 * 0.0;
  vec2 finalUV = vec2(sphereUV.x, sphereUV.y);
  fragColor = texture(uTexture, finalUV);
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function identity4() {
  // Column-major identity matrix
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

// ── Class ─────────────────────────────────────────────────────────────────────

export default class WebGLPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2");
    if (!this.gl) throw new Error("WebGL2 not supported");

    this._floatBufferSupported = !!this.gl.getExtension(
      "EXT_color_buffer_float",
    );

    this.width = canvas.width;
    this.height = canvas.height;

    this._initGeometry();
    this._initPrograms();
    this._initFBOs();
  }

  // ── Geometry ──────────────────────────────────────────────────────────────

  _initGeometry() {
    const gl = this.gl;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const positions = new Float32Array([
      -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0,
    ]);
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const texcoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    this.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  // ── Shaders / programs ────────────────────────────────────────────────────

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error:\n${info}`);
    }
    return shader;
  }

  _createProgram(vsSource, fsSource) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    // Bind attribute locations before linking so all programs share the same VAO layout
    gl.bindAttribLocation(program, 0, "aVertexPosition");
    gl.bindAttribLocation(program, 1, "aTextureCoord");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link error:\n${info}`);
    }

    return { program, locations: {} };
  }

  // ── FBOs ──────────────────────────────────────────────────────────────────

  _createFBO(downSample) {
    const gl = this.gl;
    const w = Math.floor(this.width * downSample);
    const h = Math.floor(this.height * downSample);

    const internalFormat = this._floatBufferSupported ? gl.RGBA16F : gl.RGBA8;
    const type = this._floatBufferSupported ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      gl.RGBA,
      type,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { fbo, texture, width: w, height: h, downSample };
  }

  _deleteFBO(fboObj) {
    if (!fboObj) return;
    this.gl.deleteFramebuffer(fboObj.fbo);
    this.gl.deleteTexture(fboObj.texture);
  }

  _initFBOs() {
    this.fbo1 = this._createFBO(0.5); // gradient output
    this.fbo2 = this._createFBO(1.0); // wisps output
    this.fbo3 = this._createFBO(1.0); // vignette output
    this.fbo4 = this._createFBO(1.0); // chromab output
    this.fbo5 = this._createFBO(1.0); // voronoi FBM output
    // Bloom FBOs — downsampled
    this.fboBloom0 = this._createFBO(0.25); // threshold
    this.fboBloom1 = this._createFBO(0.25); // blur H diamond r40
    this.fboBloom2 = this._createFBO(0.25); // blur V diamond r40 + bg
    this.fboBloom3 = this._createFBO(0.25); // blur H diamond r15
    this.fboBloom4 = this._createFBO(0.25); // blur V diamond r15 + bg
    this.fboBloom5 = this._createFBO(0.5); // blur H straight r7.5
    this.fboBloom6 = this._createFBO(0.5); // blur V straight r7.5
    this.fboBloom7 = this._createFBO(1.0); // final composite
    // Projection output
    this.fboProjection = this._createFBO(1.0);
  }

  // ── Matrices ──────────────────────────────────────────────────────────────

  _getIdentityMatrices() {
    return {
      mvMatrix: identity4(),
      pMatrix: identity4(),
      texMatrix: identity4(),
    };
  }

  // ── Render pass ───────────────────────────────────────────────────────────

  _renderPass(progObj, inputTexture, outputFBO, uniforms = {}) {
    const gl = this.gl;
    const { program } = progObj;

    if (outputFBO === null) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, outputFBO.fbo);
      gl.viewport(0, 0, outputFBO.width, outputFBO.height);
    }

    gl.useProgram(program);

    const { mvMatrix, pMatrix, texMatrix } = this._getIdentityMatrices();
    const mvLoc = gl.getUniformLocation(program, "uMVMatrix");
    const pLoc = gl.getUniformLocation(program, "uPMatrix");
    const txLoc = gl.getUniformLocation(program, "uTextureMatrix");
    if (mvLoc) gl.uniformMatrix4fv(mvLoc, false, mvMatrix);
    if (pLoc) gl.uniformMatrix4fv(pLoc, false, pMatrix);
    if (txLoc) gl.uniformMatrix4fv(txLoc, false, texMatrix);

    // Bind input texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture ?? null);
    const uTexLoc = gl.getUniformLocation(program, "uTexture");
    if (uTexLoc !== null) gl.uniform1i(uTexLoc, 0);

    // Extra uniforms — dispatch by value shape
    for (const [name, value] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(program, name);
      if (loc === null) continue;
      if (typeof value === "number") {
        gl.uniform1f(loc, value);
      } else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
        switch (value.length) {
          case 2:
            gl.uniform2fv(loc, value);
            break;
          case 3:
            gl.uniform3fv(loc, value);
            break;
          case 4:
            gl.uniform4fv(loc, value);
            break;
          case 16:
            gl.uniformMatrix4fv(loc, false, value);
            break;
        }
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  // ── Programs ──────────────────────────────────────────────────────────────

  _initPrograms() {
    this.progGradient = this._createProgram(VS, GRADIENT_FS);
    this.progWisps = this._createProgram(VS, WISPS_FS);
    this.progPassthrough = this._createProgram(VS, PASSTHROUGH_FS);
    this.progVignette = this._createProgram(VS, VIGNETTE_FS);
    this.progChromab = this._createProgram(VS, CHROMAB_FS);
    this.progVoronoiFBM = this._createProgram(VS, VORONOI_FBM_FS);
    this.progBloomThreshold = this._createProgram(VS, BLOOM_THRESHOLD_FS);
    this.progBloomBlur = this._createProgram(VS, BLOOM_BLUR_FS);
    this.progBloomBlurCombine = this._createProgram(VS, BLOOM_BLUR_COMBINE_FS);
    this.progBloomFinal = this._createProgram(VS, BLOOM_FINAL_FS);
    this.progProjection = this._createProgram(VS, PROJECTION_FS);
  }

  // ── Bloom helpers ─────────────────────────────────────────────────────────

  _blurDirection(diamond, vertical, radius, fboWidth, fboHeight) {
    const ar = fboWidth / fboHeight;
    let dx, dy;
    if (diamond) {
      dx = vertical ? 0.61 : 0.61;
      dy = vertical ? 0.39 : -0.39;
    } else {
      dx = vertical ? 0.0 : 0.61;
      dy = vertical ? 0.39 : 0.0;
    }
    dx /= ar;
    const stepX = (dx * radius * 0.2) / fboWidth;
    const stepY = (dy * radius * 0.2) / fboHeight;
    return [stepX, stepY];
  }

  _renderBlurPass(
    progObj,
    inputTex,
    bgTex,
    outputFBO,
    diamond,
    vertical,
    radius,
  ) {
    const dir = this._blurDirection(
      diamond,
      vertical,
      radius,
      outputFBO.width,
      outputFBO.height,
    );
    const uniforms = {
      uDirection: dir,
      uResolution: [outputFBO.width, outputFBO.height],
    };
    if (bgTex !== null) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      const loc = gl.getUniformLocation(progObj.program, "uBgTexture");
      gl.useProgram(progObj.program);
      if (loc !== null) gl.uniform1i(loc, 1);
    }
    this._renderPass(progObj, inputTex, outputFBO, uniforms);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  render(time, mouseX, mouseY) {
    // Pass 1: flat gradient → fbo1 (half-res)
    this._renderPass(this.progGradient, null, this.fbo1, {
      uMousePos: [mouseX, mouseY],
    });

    // Pass 2: voronoi wisps on top of gradient → fbo2 (full-res)
    this._renderPass(this.progWisps, this.fbo1.texture, this.fbo2, {
      uTime: time,
      uMousePos: [mouseX, mouseY],
      uResolution: [this.width, this.height],
    });

    // Pass 3: vignette
    this._renderPass(this.progVignette, this.fbo2.texture, this.fbo3, {
      uMousePos: [mouseX, mouseY],
      uResolution: [this.width, this.height],
    });

    // Pass 4: chromatic aberration
    this._renderPass(this.progChromab, this.fbo3.texture, this.fbo4, {
      uTime: time,
      uMousePos: [mouseX, mouseY],
      uResolution: [this.width, this.height],
    });

    // Pass 5: voronoi FBM distortion
    this._renderPass(this.progVoronoiFBM, this.fbo4.texture, this.fbo5, {
      uTime: time,
      uMousePos: [mouseX, mouseY],
      uResolution: [this.width, this.height],
    });

    // ── Bloom ──────────────────────────────────────────────────────────────
    // Pass 6a: threshold
    this._renderPass(
      this.progBloomThreshold,
      this.fbo5.texture,
      this.fboBloom0,
      {},
    );

    // Pass 6b: blur H diamond r40
    this._renderBlurPass(
      this.progBloomBlur,
      this.fboBloom0.texture,
      null,
      this.fboBloom1,
      true,
      false,
      40,
    );

    // Pass 6c: blur V diamond r40 + bg
    this._renderBlurPass(
      this.progBloomBlurCombine,
      this.fboBloom1.texture,
      this.fbo5.texture,
      this.fboBloom2,
      true,
      true,
      40,
    );

    // Pass 6d: blur H diamond r15
    this._renderBlurPass(
      this.progBloomBlur,
      this.fboBloom2.texture,
      null,
      this.fboBloom3,
      true,
      false,
      15,
    );

    // Pass 6e: blur V diamond r15 + bg
    this._renderBlurPass(
      this.progBloomBlurCombine,
      this.fboBloom3.texture,
      this.fbo5.texture,
      this.fboBloom4,
      true,
      true,
      15,
    );

    // Pass 6f: blur H straight r7.5
    this._renderBlurPass(
      this.progBloomBlur,
      this.fboBloom4.texture,
      null,
      this.fboBloom5,
      false,
      false,
      7.5,
    );

    // Pass 6g: blur V straight r7.5
    this._renderBlurPass(
      this.progBloomBlur,
      this.fboBloom5.texture,
      null,
      this.fboBloom6,
      false,
      true,
      7.5,
    );

    // Pass 6h: final bloom composite (bloom + scene)
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fbo5.texture);
    gl.useProgram(this.progBloomFinal.program);
    const bgLoc = gl.getUniformLocation(
      this.progBloomFinal.program,
      "uBgTexture",
    );
    if (bgLoc !== null) gl.uniform1i(bgLoc, 1);
    this._renderPass(
      this.progBloomFinal,
      this.fboBloom6.texture,
      this.fboBloom7,
      {},
    );

    // ── Projection ─────────────────────────────────────────────────────────
    // REPEAT wrap so the spherical UV scroll loops seamlessly without fract()
    gl.bindTexture(gl.TEXTURE_2D, this.fboBloom7.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this._renderPass(this.progProjection, this.fboBloom7.texture, null, {
      uTime: time,
      uMousePos: [mouseX, mouseY],
    });
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this._deleteFBO(this.fbo1);
    this._deleteFBO(this.fbo2);
    this._deleteFBO(this.fbo3);
    this._deleteFBO(this.fbo4);
    this._deleteFBO(this.fbo5);
    [
      "fboBloom0",
      "fboBloom1",
      "fboBloom2",
      "fboBloom3",
      "fboBloom4",
      "fboBloom5",
      "fboBloom6",
      "fboBloom7",
      "fboProjection",
    ].forEach((k) => this._deleteFBO(this[k]));
    this._initFBOs();
  }

  destroy() {
    const gl = this.gl;

    for (const key of ["progGradient", "progWisps", "progPassthrough"]) {
      if (this[key]) gl.deleteProgram(this[key].program);
    }
    for (const key of ["progVignette", "progChromab", "progVoronoiFBM"]) {
      if (this[key]) gl.deleteProgram(this[key].program);
    }
    for (const key of [
      "progBloomThreshold",
      "progBloomBlur",
      "progBloomBlurCombine",
      "progBloomFinal",
      "progProjection",
    ]) {
      if (this[key]) gl.deleteProgram(this[key].program);
    }

    this._deleteFBO(this.fbo1);
    this._deleteFBO(this.fbo2);
    this._deleteFBO(this.fbo3);
    this._deleteFBO(this.fbo4);
    this._deleteFBO(this.fbo5);
    [
      "fboBloom0",
      "fboBloom1",
      "fboBloom2",
      "fboBloom3",
      "fboBloom4",
      "fboBloom5",
      "fboBloom6",
      "fboBloom7",
      "fboProjection",
    ].forEach((k) => this._deleteFBO(this[k]));

    if (this.posBuffer) gl.deleteBuffer(this.posBuffer);
    if (this.texBuffer) gl.deleteBuffer(this.texBuffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
