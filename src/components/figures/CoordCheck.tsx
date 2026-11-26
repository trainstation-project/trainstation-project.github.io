// muP coord-check figures: activation RMS against width for SP and muP.
// Data (means over seeds, plus least-squares growth exponents) is baked into
// coord-check/data.json. Colors come from CSS variables, so the figures follow
// the site theme without re-rendering.
import { useState, type PointerEvent } from 'react';
import data from './coord-check/data.json';
import './coord-check/coord-check.css';

type Mode = 'sp' | 'mup';
type Rms = Record<string, number[][]>;
type Slopes = Record<string, number[]>;

const W: number[] = data.config.widths;
const STEPS: number[] = data.config.record_steps;
const LAST = STEPS.length - 1;
const NAMES: string[] = data.names;
const RMS = data.rms as Record<Mode, Rms>;
const SLOPE = data.slope as Record<Mode, Slopes>;
const MODE_LABEL: Record<Mode, string> = { sp: 'SP', mup: 'muP' };
const stepColor = (mode: Mode, i: number) => `var(--cc-${mode}-${i})`;
const modeColor = (mode: Mode) => `var(--cc-${mode})`;

const fmtW = (w: number) => (w >= 1024 ? `${w / 1024}k` : String(w));
const fmt = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-2) return v.toExponential(2).replace('e+', 'e');
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toPrecision(3);
};
const fmtExp = (p: number) => (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(2);

const LABELS: Record<string, string> = {
  'embedding (x m_emb)': 'embedding (× m_emb)',
  final_norm: 'final norm',
};
const label = (n: string) =>
  LABELS[n] ?? n.replace(/^L\d /, '').replace('x m_residual', '× m_residual');

const GROUPS = [
  {
    title: 'Input',
    desc: 'Token embedding, including the m_emb multiplier under muP.',
    names: NAMES.filter((n) => n.startsWith('embedding')),
  },
  {
    title: 'Layer 0',
    desc: 'First transformer block. The wo and w2 outputs include the m_residual multiplier under muP.',
    names: NAMES.filter((n) => n.startsWith('L0 ')),
  },
  { title: 'Layer 1', desc: 'Second transformer block.', names: NAMES.filter((n) => n.startsWith('L1 ')) },
  {
    title: 'Output',
    desc: 'Final norm and logits. Under muP the logits include the 1/m_width multiplier.',
    names: ['final_norm', 'logits'],
  },
];

// ---------- tooltip ----------

type TipState = {
  x: number;
  y: number;
  head: string;
  rows: { label: string; value: string; color: string }[];
} | null;

function Tooltip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  const pad = 14;
  const flipX = typeof window !== 'undefined' && tip.x + 240 > window.innerWidth;
  const flipY = typeof window !== 'undefined' && tip.y + 200 > window.innerHeight;
  const style = {
    left: flipX ? undefined : tip.x + pad,
    right: flipX ? window.innerWidth - tip.x + pad : undefined,
    top: flipY ? undefined : tip.y + pad,
    bottom: flipY ? window.innerHeight - tip.y + pad : undefined,
  };
  return (
    <div className="cc-tip" style={style}>
      <div className="cc-tip-head">{tip.head}</div>
      {tip.rows.map((r) => (
        <div className="cc-tip-row" key={r.label}>
          <span>
            <i className="cc-sw" style={{ background: r.color }} />
            {r.label}
          </span>
          <b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

// ---------- exponent table ----------

export function CoordExponents() {
  const [step, setStep] = useState(LAST);
  const lo = -0.6;
  const hi = 3.2;
  const sw = 220;
  const sh = 18;
  const sx = (p: number) => 6 + ((Math.min(hi, Math.max(lo, p)) - lo) / (hi - lo)) * (sw - 12);
  return (
    <div className="cc">
      <div className="cc-controls">
        <span>Exponent at</span>
        <div className="cc-seg" role="group" aria-label="Exponent at step">
          <button type="button" aria-pressed={step === 0} onClick={() => setStep(0)}>
            init
          </button>
          <button type="button" aria-pressed={step === LAST} onClick={() => setStep(LAST)}>
            step {STEPS[LAST]}
          </button>
        </div>
        <span className="cc-key">
          <i style={{ background: modeColor('sp') }} />
          SP
        </span>
        <span className="cc-key">
          <i style={{ background: modeColor('mup') }} />
          muP
        </span>
      </div>
      <div className="cc-table-scroll">
        <table className="cc-table">
          <thead>
            <tr>
              <th>activation</th>
              <th style={{ textAlign: 'right' }}>SP</th>
              <th style={{ textAlign: 'right' }}>muP</th>
              <th>
                <svg viewBox={`0 0 ${sw} ${sh}`} width={sw} height={sh} style={{ display: 'block' }} aria-hidden="true">
                  {[0, 1, 2, 3].map((v) => (
                    <text key={v} x={sx(v)} y={13} textAnchor="middle">
                      {v}
                    </text>
                  ))}
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.flatMap((g) => [
              <tr className="cc-group" key={g.title}>
                <td colSpan={4}>{g.title}</td>
              </tr>,
              ...g.names.map((n) => {
                const ps = SLOPE.sp[n][step];
                const pm = SLOPE.mup[n][step];
                return (
                  <tr key={n}>
                    <td>{label(n)}</td>
                    <td className="cc-num">{fmtExp(ps)}</td>
                    <td className="cc-num">{fmtExp(pm)}</td>
                    <td className="cc-strip">
                      <svg
                        viewBox={`0 0 ${sw} ${sh}`}
                        width={sw}
                        height={sh}
                        style={{ display: 'block' }}
                        role="img"
                        aria-label={`SP ${ps.toFixed(2)}, muP ${pm.toFixed(2)}`}
                      >
                        <line x1={sx(0)} x2={sx(0)} y1={2} y2={sh - 2} style={{ stroke: 'var(--line)' }} strokeWidth={1} />
                        <line x1={sx(pm)} x2={sx(ps)} y1={sh / 2} y2={sh / 2} style={{ stroke: 'var(--line)' }} strokeWidth={2} />
                        <circle cx={sx(pm)} cy={sh / 2} r={4.5} style={{ fill: modeColor('mup'), stroke: 'var(--paper)' }} strokeWidth={2} />
                        <circle cx={sx(ps)} cy={sh / 2} r={4.5} style={{ fill: modeColor('sp'), stroke: 'var(--paper)' }} strokeWidth={2} />
                      </svg>
                    </td>
                  </tr>
                );
              }),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- small multiples ----------

const PW = 340;
const PH = 200;
const M = { l: 46, r: 30, t: 26, b: 28 };
const xs = (w: number) =>
  M.l + ((Math.log2(w) - Math.log2(W[0])) / (Math.log2(W[W.length - 1]) - Math.log2(W[0]))) * (PW - M.l - M.r);

function yTicks(lo: number, hi: number) {
  // lo, hi in log10. Decades when the range is wide, 1-2-5 otherwise.
  const ticks: number[] = [];
  const span = hi - lo;
  const mults = span > 3 ? [1] : span > 1.2 ? [1, 3] : [1, 2, 5];
  const step = span > 7 ? 2 : 1;
  for (let d = Math.floor(lo); d <= Math.ceil(hi); d += step) {
    for (const m of mults) {
      const v = Math.log10(m) + d;
      if (v >= lo - 1e-9 && v <= hi + 1e-9) ticks.push(v);
    }
  }
  return ticks;
}

function bounds(vals: number[]): [number, number] {
  let lo = Math.log10(Math.min(...vals));
  let hi = Math.log10(Math.max(...vals));
  if (hi - lo < 0.6) {
    const mid = (hi + lo) / 2;
    lo = mid - 0.3;
    hi = mid + 0.3;
  }
  const pad = (hi - lo) * 0.06;
  return [lo - pad, hi + pad];
}

function Panel({
  name,
  mode,
  range,
  setTip,
}: {
  name: string;
  mode: Mode;
  range: [number, number];
  setTip: (t: TipState) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [lo, hi] = range;
  const series = RMS[mode][name];
  const y = (v: number) => PH - M.b - ((Math.log10(v) - lo) / (hi - lo)) * (PH - M.t - M.b);
  const lastV = series[LAST][W.length - 1];

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * PW;
    let best = 0;
    W.forEach((w, i) => {
      if (Math.abs(xs(w) - px) < Math.abs(xs(W[best]) - px)) best = i;
    });
    setHover(best);
    setTip({
      x: e.clientX,
      y: e.clientY,
      head: `${MODE_LABEL[mode]} · ${label(name)} · width ${W[best]}`,
      rows: STEPS.map((s, si) => ({ label: `step ${s}`, value: fmt(series[si][best]), color: stepColor(mode, si) })).reverse(),
    });
  };

  return (
    <div className="cc-panel">
      <span className="cc-panel-label" style={{ color: modeColor(mode) }}>
        {MODE_LABEL[mode]}
      </span>
      <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={`${MODE_LABEL[mode]} ${label(name)} RMS against width`}>
        {yTicks(lo, hi).map((tv) => {
          const yy = PH - M.b - ((tv - lo) / (hi - lo)) * (PH - M.t - M.b);
          return (
            <g key={tv}>
              <line x1={M.l} x2={PW - M.r} y1={yy} y2={yy} style={{ stroke: 'var(--cc-grid)' }} strokeWidth={1} />
              <text x={M.l - 6} y={yy + 3} textAnchor="end">
                {fmt(10 ** tv)}
              </text>
            </g>
          );
        })}
        {W.map((w) => (
          <text key={w} x={xs(w)} y={PH - M.b + 14} textAnchor="middle">
            {fmtW(w)}
          </text>
        ))}
        <line x1={M.l} x2={PW - M.r} y1={PH - M.b} y2={PH - M.b} style={{ stroke: 'var(--line)' }} strokeWidth={1} />
        {series.map((vals, si) => (
          <polyline
            key={si}
            points={vals.map((v, i) => `${xs(W[i])},${y(v)}`).join(' ')}
            fill="none"
            style={{ stroke: stepColor(mode, si) }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={xs(W[W.length - 1])}
          cy={y(lastV)}
          r={4}
          style={{ fill: stepColor(mode, LAST), stroke: 'var(--paper)' }}
          strokeWidth={2}
        />
        <text x={xs(W[W.length - 1]) + 7} y={Math.max(M.t + 4, Math.min(PH - M.b, y(lastV) + 3))} style={{ fill: 'var(--ink)' }}>
          {`t${STEPS[LAST]}`}
        </text>
        {hover !== null && (
          <g>
            <line
              x1={xs(W[hover])}
              x2={xs(W[hover])}
              y1={M.t - 4}
              y2={PH - M.b}
              style={{ stroke: 'var(--muted)' }}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {series.map((vals, si) => (
              <circle
                key={si}
                cx={xs(W[hover])}
                cy={y(vals[hover])}
                r={4}
                style={{ fill: stepColor(mode, si), stroke: 'var(--paper)' }}
                strokeWidth={2}
              />
            ))}
          </g>
        )}
        <rect
          x={M.l - 10}
          y={0}
          width={PW - M.l - M.r + 20}
          height={PH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerEnter={onMove}
          onPointerLeave={() => {
            setHover(null);
            setTip(null);
          }}
        />
      </svg>
    </div>
  );
}

export function CoordPanels() {
  const [ownScale, setOwnScale] = useState(false);
  const [tip, setTip] = useState<TipState>(null);
  const all = (n: string, mode: Mode) => RMS[mode][n].flat();
  return (
    <div className="cc">
      <div className="cc-controls">
        <span>Training step</span>
        {(['sp', 'mup'] as Mode[]).map((mode) => (
          <span className="cc-ramp" key={mode} aria-label={`${MODE_LABEL[mode]} step colors`}>
            {STEPS.map((_, si) => (
              <i key={si} style={{ background: stepColor(mode, si) }} />
            ))}
          </span>
        ))}
        <span className="cc-mono">steps {STEPS.join(' · ')}</span>
        <label className="cc-toggle">
          <input type="checkbox" id="cc-own-scale" checked={ownScale} onChange={(e) => setOwnScale(e.target.checked)} />
          Scale each panel separately
        </label>
      </div>
      <div className="cc-groups">
        {GROUPS.map((g) => (
          <div className="cc-acts" key={g.title}>
            <div className="cc-group-title">
              <span className="cc-eyebrow">{g.title}</span>
              <p>{g.desc}</p>
            </div>
            {g.names.map((n) => {
              const shared = bounds([...all(n, 'sp'), ...all(n, 'mup')]);
              const chip = (mode: Mode) => {
                const p = SLOPE[mode][n][LAST];
                return (
                  <span className={`cc-chip ${Math.abs(p) < 0.35 ? 'flat' : 'grow'}`}>
                    {MODE_LABEL[mode]} {'∝'} w<sup>{fmtExp(p)}</sup>
                  </span>
                );
              };
              return (
                <div className="cc-act" key={n}>
                  <div className="cc-act-head">
                    <h4>
                      {n.startsWith('L') ? `${n.slice(0, 2)} · ` : ''}
                      {label(n)}
                    </h4>
                    {chip('sp')}
                    {chip('mup')}
                    <span className="cc-mono" style={{ color: 'var(--muted)' }}>
                      at step {STEPS[LAST]}
                    </span>
                  </div>
                  <div className="cc-pair">
                    {(['sp', 'mup'] as Mode[]).map((mode) => (
                      <Panel
                        key={mode}
                        name={n}
                        mode={mode}
                        range={ownScale ? bounds(all(n, mode)) : shared}
                        setTip={setTip}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
