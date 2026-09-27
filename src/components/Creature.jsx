import { useEffect, useRef } from 'react';

/*
  The day's market creature, drawn with the day's own numbers.
  A silhouette (bull, bear or crab) is rasterised to a character grid, then every cell is
  filled with the next character of the "tape" (NIFTY and your holdings with their moves).
  Edges glow brighter so the shape reads, and the tape slowly flows through the body so it feels live.
  Reduced motion: drawn once, fully formed.
*/

/* silhouettes live in a 200 x 120 design box, animals facing right (forward, into the future) */
function drawBull(ctx) {
  const p = new Path2D(
    'M32 48 L12 30 L10 33 L27 52 L26 62 L30 76 L34 88 L32 112 L38 112 L44 92 L52 94 L54 114 L60 114 L64 96 ' +
    'L72 92 L118 92 L120 114 L126 114 L128 94 L134 100 L144 118 L150 116 L142 94 L144 80 L158 80 L172 86 ' +
    'L182 80 L180 66 L172 58 L186 50 L194 34 L182 44 L168 52 L164 46 L170 20 L158 32 L152 46 L142 36 ' +
    'L124 22 L106 26 L72 40 L40 44 Z',
  );
  ctx.fill(p);
}

function drawBear(ctx) {
  const p = new Path2D(
    'M20 60 L14 62 L18 68 L20 80 L24 92 L22 112 L34 112 L38 94 L46 96 L46 112 L58 112 L60 94 L118 96 ' +
    'L116 112 L128 112 L132 96 L140 94 L140 112 L152 112 L152 88 L158 80 L168 82 L184 80 L190 74 L186 68 ' +
    'L172 60 L168 50 L162 48 L158 54 L146 50 L128 36 L110 38 L70 38 L40 44 L24 52 Z',
  );
  ctx.fill(p);
}

function drawCrab(ctx) {
  ctx.beginPath();
  ctx.ellipse(100, 74, 40, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  const stroke = pts => { ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach(q => ctx.lineTo(...q)); ctx.stroke(); };
  // legs, three a side
  [[70, 82, 48, 96, 40, 110], [74, 88, 56, 104, 52, 116], [80, 92, 68, 108, 66, 118]].forEach(([a, b, c, d, e, f]) => {
    stroke([[a, b], [c, d], [e, f]]);
    stroke([[200 - a, b], [200 - c, d], [200 - e, f]]);
  });
  // arms and claws
  stroke([[70, 64], [50, 50], [42, 36]]);
  stroke([[130, 64], [150, 50], [158, 36]]);
  [[38, 26], [162, 26]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.ellipse(x, y, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
  });
  // eye stalks
  ctx.lineWidth = 4;
  stroke([[90, 54], [88, 42]]);
  stroke([[110, 54], [112, 42]]);
  ctx.beginPath(); ctx.arc(88, 40, 4.5, 0, Math.PI * 2); ctx.arc(112, 40, 4.5, 0, Math.PI * 2); ctx.fill();
}

const SHAPES = { bull: drawBull, bear: drawBear, crab: drawCrab };

function buildMask(kind, cols, rows, sx, sy, ox, oy) {
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  /* cells aren't square, so x and y scale separately to keep the animal's proportions */
  ctx.translate(ox, oy);
  ctx.scale(sx, sy);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  SHAPES[kind](ctx);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const on = new Uint8Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) on[i] = data[i * 4 + 3] > 90 ? 1 : 0;
  const edge = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!on[i]) continue;
      const n = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= cols || yy >= rows ? 0 : on[yy * cols + xx]; };
      if (!n(1, 0) || !n(-1, 0) || !n(0, 1) || !n(0, -1)) edge[i] = 1;
    }
  }
  return { on, edge };
}

export default function Creature({ kind = 'crab', tape = '', color = '#8fb0ff', dim = false, className = '', label }) {
  const wrap = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    const el = canvas.current, box = wrap.current;
    if (!el || !box) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* the body is drawn with the tape's characters only; spaces would leave holes */
    const text = (tape || 'NIFTY50').replace(/\s+/g, '');
    /* canvas can't read CSS variables, so resolve var(--x) to a real colour */
    const resolve = () => (color.startsWith('var(')
      ? getComputedStyle(document.documentElement).getPropertyValue(color.slice(4, -1)).trim() || '#8fb0ff'
      : color);
    let raf = 0, timer = 0, cancelled = false;

    const start = () => {
      cancelAnimationFrame(raf); clearTimeout(timer);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      const font = w < 420 ? 7 : 9;
      const cw = font * 0.62, ch = font * 1.08;
      const cols = Math.floor(w / cw), rows = Math.floor(h / ch);
      el.width = w * dpr; el.height = h * dpr;
      el.style.width = w + 'px'; el.style.height = h + 'px';
      const ctx = el.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.font = `600 ${font}px "Geist Mono Variable", ui-monospace, monospace`;
      ctx.textBaseline = 'top';

      /* fit the 200 x 120 design box into the canvas in pixels, then express that in cells */
      const P = Math.min(w / 200, h / 120);
      const ox = (w - 200 * P) / 2, oy = (h - 120 * P) / 2;
      const { on, edge } = buildMask(kind, cols, rows, P / cw, P / ch, ox / cw, oy / ch);
      /* a soft glow of the silhouette sits behind the characters so the form reads at a glance */
      const glow = document.createElement('canvas');
      glow.width = w; glow.height = h;
      const g = glow.getContext('2d');
      g.translate(ox, oy); g.scale(P, P);
      g.fillStyle = '#fff'; g.strokeStyle = '#fff';
      SHAPES[kind](g);
      const cells = [];
      let k = 0;
      for (let i = 0; i < on.length; i++) {
        if (!on[i]) continue;
        cells.push({ k: k++, x: (i % cols) * cw, y: Math.floor(i / cols) * ch, edge: edge[i], born: Math.random() });
      }
      /* sparse dust outside the shape: the rest of the tape drifting past */
      const dust = [];
      for (let i = 0; i < on.length; i++) {
        if (!on[i] && Math.random() < 0.035) dust.push({ x: (i % cols) * cw, y: Math.floor(i / cols) * ch, ch: text[(i * 7) % text.length] });
      }

      const t0 = performance.now();
      const draw = now => {
        if (cancelled) return;
        const t = (now - t0) / 1000;
        const grow = reduce ? 1 : Math.min(1, t / 1.1);
        ctx.clearRect(0, 0, w, h);
        const col = resolve(); // per frame, so a mood change recolours it
        ctx.save();
        ctx.globalAlpha = (dim ? 0.06 : 0.2) * grow;
        ctx.filter = 'blur(14px)';
        ctx.drawImage(glow, 0, 0, w, h);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = col;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        ctx.fillStyle = col;
        ctx.globalAlpha = dim ? 0.08 : 0.13;
        dust.forEach(d => ctx.fillText(d.ch, d.x, d.y));
        const wave = (t * 0.35) % 1.6 - 0.3; // a slow band of light sweeping across
        /* the tape flows through the body, one character every ~140ms, like a live ticker */
        const shift = reduce ? 0 : Math.floor(t * 7) % text.length;
        for (const c of cells) {
          if (c.born > grow) continue;

          const pos = c.x / w;
          const lit = Math.max(0, 1 - Math.abs(pos - wave) * 5) * 0.35;
          ctx.globalAlpha = (dim ? 0.4 : 1) * ((c.edge ? 1 : 0.62) + lit);
          ctx.fillText(text[(c.k + shift) % text.length], c.x, c.y);
        }
        ctx.globalAlpha = 1;
        /* a plain timer (~14fps) rather than rAF: calm enough for a shimmer, and it keeps going in background panes */
        if (!reduce) timer = setTimeout(() => draw(performance.now()), 70);
      };
      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => start());
    ro.observe(box);
    document.fonts?.ready.then(() => !cancelled && start());
    return () => { cancelled = true; ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [kind, tape, color, dim]);

  return (
    <div ref={wrap} className={`relative ${className}`} role="img" aria-label={label}>
      <canvas ref={canvas} className="absolute inset-0" />
    </div>
  );
}
