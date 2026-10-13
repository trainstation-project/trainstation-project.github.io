// Interactive measured figures for the depthwise-causal-convolution post.
// Specs are baked from the measured JSONs by gen_blog_figures.py in the
// accelerated-model-architectures repo (benchmarks/depthwise_causal_convolution/);
// do not hand-edit numbers here — re-run the generator.
import specs from './dwc/charts.json';
import PlotChart, { type ChartSpec } from '../PlotChart';

const s = specs as Record<string, ChartSpec>;

// plotly.js-basic-dist-min doesn't reliably honor the flat `marker_color`
// shorthand — traces that only set it fall back to default auto-cycled
// colors (and a different cycle position per fwd/bwd half, since they have
// different segment counts, which is why the two charts' colors drifted
// apart). Normalize it into the nested `marker.color` form that actually
// renders, so every trace gets its real, intended, consistent color.
function normalizeMarkerColor(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) =>
    t.marker_color && !t.marker?.color
      ? { ...t, marker: { ...t.marker, color: t.marker_color } }
      : t
  );
  return { ...spec, traces };
}

// Drops the host-dispatch-gap segment entirely — now that everything else
// on these charts is framed in device time, a wall-vs-device sliver doesn't
// fit the story. (Bonus: once it's gone, the XLA bar's stacked height sums
// to exactly its device total, so the annotation lines up perfectly too.)
function dropDispatchGaps(spec: ChartSpec): ChartSpec {
  return { ...spec, traces: spec.traces.filter((t) => t.legendgroup !== 'gap') };
}

// Splits the combined fwd+bwd XLA-comparison spec into a fwd-only or bwd-only
// spec (by category-label prefix), stripping the now-redundant prefix so each
// half reads cleanly on its own. The baked "pallas (pre-opt)" label is the
// first kernel, which the post calls kernel v1.
const V1_LABEL = 'kernel v1';
function halfSpec(spec: ChartSpec, prefix: 'fwd' | 'bwd'): ChartSpec {
  const strip = (label: unknown) =>
    String(label).replace(new RegExp(`^${prefix}\\s*`), '').replace('pallas (pre-opt)', V1_LABEL);
  const traces = spec.traces
    .filter((t) => String(t.y?.[0] ?? '').startsWith(prefix))
    .map((t) => ({ ...t, y: [strip(t.y[0])] }));
  const annotations = (spec.layout.annotations ?? [])
    .filter((a: Record<string, any>) => String(a.y ?? '').startsWith(prefix))
    .map((a: Record<string, any>) => ({ ...a, y: strip(a.y) }));
  return { ...spec, traces, layout: { ...spec.layout, annotations } };
}

// The pre-optimization reference bar ships as a hollow dashed outline
// (marker.color transparent) — give it a solid fill so it reads as a bar
// rather than an empty box.
function fillPreOpt(spec: ChartSpec, fill = '#c94f7c'): ChartSpec {
  const traces = spec.traces.map((t) =>
    t.legendgroup === 'preopt' ? { ...t, marker: { color: fill } } : t
  );
  return { ...spec, traces };
}

// Measured logical bandwidth (TB/s) per phase/category — from
// results_100iters.json's logical_bandwidth_TBps (bytes / measured latency).
// The pre-optimization bar already carries its own BW in its baked
// hovertemplate, so it's deliberately absent here. XLA's multi-segment bar
// gets a labeled "bar total:" line (its own segments already have their own
// numbers); FLAT is a single segment, so its BW is added plainly,
// matching the pre-optimization bar's style.
const FWD_BW: Record<string, number> = { XLA: 0.548 };
const BWD_BW: Record<string, number> = { XLA: 0.134 };
const FWD_PALLAS_BW: Record<string, number> = { 'FLAT': 1.126 };
const BWD_PALLAS_BW: Record<string, number> = { 'FLAT': 0.937 };

// The on-chart annotations only ever existed for the XLA and XMA-pallas-final
// bars — add the missing one for the pre-opt reference bar (best available
// figure, since pre-opt dispatch overhead was never split out separately).
const PREOPT_US: Record<'fwd' | 'bwd', number> = { fwd: 272, bwd: 526 };

function addPreOptAnnotation(spec: ChartSpec, phase: 'fwd' | 'bwd'): ChartSpec {
  const us = PREOPT_US[phase];
  const preOptTrace = spec.traces.find((t) => t.legendgroup === 'preopt');
  const x = preOptTrace?.x?.[0] ?? us;
  const annotation = {
    x,
    y: V1_LABEL,
    xref: 'x',
    yref: 'y',
    text: `  ${us} µs`,
    showarrow: false,
    font: { size: 11, color: '#3d3a33' },
    xanchor: 'left',
  };
  return { ...spec, layout: { ...spec.layout, annotations: [...(spec.layout.annotations ?? []), annotation] } };
}

// Total measured device time (Σ device, from XProf) per phase/category —
// the baked annotations show wall-clock totals, so relabel (and, now that
// dropDispatchGaps removed the gap sliver, reposition) them to device time.
// For XLA the bar's stacked height now sums to exactly this value; for
// FLAT the bar was never split into wall/device segments, so its
// height stays at its own (near-identical) wall figure — imperceptible here.
const FWD_DEVICE_US: Record<string, number> = { XLA: 495.1, 'FLAT': 239.5 };
const BWD_DEVICE_US: Record<string, number> = { XLA: 2806.3, 'FLAT': 431.1 };

function toDeviceAnnotations(spec: ChartSpec, deviceMap: Record<string, number>): ChartSpec {
  const annotations = (spec.layout.annotations ?? []).map((a: Record<string, any>) => {
    const us = deviceMap[String(a.y)];
    return us == null ? a : { ...a, x: us, text: `  ${us} µs` };
  });
  return { ...spec, layout: { ...spec.layout, annotations } };
}

// Appends the bar's total measured bandwidth to every segment's hover
// tooltip (each stacked segment already shows its own µs/MFLOP/MB detail).
function addBandwidthToHover(spec: ChartSpec, bwMap: Record<string, number>, label = 'bar total'): ChartSpec {
  const traces = spec.traces.map((t) => {
    const bw = bwMap[String(t.y?.[0] ?? '')];
    if (bw == null || !t.hovertemplate) return t;
    return { ...t, hovertemplate: t.hovertemplate.replace('<extra></extra>', `<br><b>${label}</b>: ${bw.toFixed(3)} TB/s<extra></extra>`) };
  });
  return { ...spec, traces };
}

// Appends each bar's own speedup over XLA's device total (same basis as the
// figure's own "vs XLA" annotations: FWD/BWD_DEVICE_US for FLAT, PREOPT_US
// for the pre-opt bar) to that bar's hover — FLAT and pre-opt each get their
// own, different, number. XLA's own segments are left untouched: a single
// bar-level speedup describes the whole bar's total, not any one sub-segment
// (which has no matching FLAT/pre-opt sub-part to be "faster" than).
function addSpeedupToHover(spec: ChartSpec, deviceMap: Record<string, number>, phase: 'fwd' | 'bwd'): ChartSpec {
  const speedups: Record<string, number> = {
    FLAT: deviceMap.XLA / deviceMap.FLAT,
    [V1_LABEL]: deviceMap.XLA / PREOPT_US[phase],
  };
  const traces = spec.traces.map((t) => {
    const speedup = speedups[String(t.y?.[0] ?? '')];
    if (speedup == null || typeof t.hovertemplate !== 'string') return t;
    return { ...t, hovertemplate: t.hovertemplate.replace('<extra></extra>', `<br><b>speedup</b>: ${speedup.toFixed(2)}×<extra></extra>`) };
  });
  return { ...spec, traces };
}

// Flips a horizontal (category-on-y) bar spec to vertical (category-on-x),
// swapping the wall-time annotations to sit above each bar instead of past
// its right end.
//
// Also pins xaxis.categoryarray to exactly the categories this chart's own
// traces have. plotly.js-basic-dist-min has already shown one cross-instance
// leak (the marker_color bug above) — without an explicit categoryarray,
// the fwd and bwd chart instances can end up sharing a stray extra category
// tick (e.g. a zero-height "bwd pallas (pre-opt)" appearing on the fwd
// chart), so we never trust the library's own axis auto-discovery here.
function verticalize(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) => ({ ...t, x: t.y, y: t.x, orientation: 'v' }));
  const annotations = (spec.layout.annotations ?? []).map((a: Record<string, any>) => ({
    ...a,
    x: a.y,
    y: a.x,
    xanchor: 'center',
    yanchor: 'bottom',
    text: String(a.text).trim(),
  }));
  const categoryarray = [...new Set(traces.map((t) => t.x[0]))];
  return {
    ...spec,
    traces,
    layout: {
      ...spec.layout,
      annotations,
      showlegend: false,
      margin: { l: 56, r: 16, t: 26, b: 72 },
      // The swap moves the category labels onto this axis, but its title
      // ("µs / call") was written for the original horizontal µs axis —
      // carrying it over mislabels the bottom of the chart. Drop it; the
      // bar labels are self-explanatory.
      xaxis: { ...(spec.layout.xaxis ?? {}), title: undefined, categoryorder: 'array', categoryarray },
      // After the swap this axis is always the numeric µs value axis, never
      // categorical — force the type so Plotly can't mis-infer it as
      // categorical and pull in a stray category tick from elsewhere
      // (observed: a "bwd pallas (pre-opt)" y-tick leaking onto both the
      // fwd and bwd chart instances despite _fullData/_fullLayout showing
      // clean, correct per-chart category lists — a plotly.js-basic-dist-min
      // quirk, consistent with the marker_color bug documented above).
      yaxis: { ...(spec.layout.yaxis ?? {}), type: 'linear' },
    },
  };
}

// The backward XLA bar stacks two distinct MXU segments — "dW: batch-grouped
// conv" and "dx: transposed depthwise conv" — and the baked spec colors both
// by device unit (MXU), so they're identical and unreadable as separate
// segments in the stacked bar. Give the second one its own color.
function distinguishBwdMxuSegments(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) =>
    typeof t.legendgroup === 'string' && t.legendgroup.startsWith('dx: transposed depthwise conv')
      ? { ...t, marker: { ...t.marker, color: '#a8763e' } }
      : t
  );
  return { ...spec, traces };
}

const xlaHoverFixed = distinguishBwdMxuSegments(dropDispatchGaps(normalizeMarkerColor(s.xla)));

// The baked spec's axes are log-scale (range bounds stored as log10 of the
// actual data bounds, per Plotly convention). Converting to linear needs the
// range converted back out of log space too, or the axis would only show a
// sliver of the original span.
function toLinearAxes(spec: ChartSpec): ChartSpec {
  const toLinear = (axis: Record<string, any>) => {
    if (!axis || axis.type !== 'log') return axis;
    const [lo, hi] = axis.range ?? [];
    return {
      ...axis,
      type: 'linear',
      range: lo != null && hi != null ? [10 ** lo, 10 ** hi] : axis.range,
    };
  };
  return {
    ...spec,
    layout: { ...spec.layout, xaxis: toLinear(spec.layout.xaxis), yaxis: toLinear(spec.layout.yaxis) },
  };
}

// The baked curve uses the rounded 1.6 TB/s figure for the v6e's spec HBM
// bandwidth; the actual advertised number is 1638 GB/s (1.638 TB/s). Re-slope
// the diagonal (bandwidth-bound) segment to the precise value, keeping the
// same measured VPU compute ceiling (7.09 TFLOP/s, unrelated to HBM
// bandwidth) — everything downstream (ridge point, the AI-line's termination,
// its bandwidth readout) is derived from this trace, so it all follows.
const V6E_SPEC_BW_TBPS = 1.638;

function adjustSpecBandwidth(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) => {
    if (t.mode !== 'lines' || !Array.isArray(t.x)) return t;
    const ceiling = t.y[t.y.length - 1];
    const y = t.x.map((x: number) => Math.min(V6E_SPEC_BW_TBPS * x, ceiling));
    const name = typeof t.name === 'string' ? t.name.replace(/[\d.]+\s*TB\/s spec HBM/, `${V6E_SPEC_BW_TBPS} TB/s spec HBM`) : t.name;
    return { ...t, y, name };
  });
  return { ...spec, traces };
}

// Plotly hover always snaps to the *nearest sampled point* on a line trace.
// The baked curve's ~400 points are spread over its original, much wider
// span; once the axis is trimmed to [0, 7] (starting exactly at the origin)
// those points leave visible gaps — worst right at the start, where the
// first real sample sits all the way out at x=0.5 — so hovering feels like
// it jumps between points rather than tracking the cursor. The curve is
// exactly piecewise-linear (known slope/ceiling, derived from the trace
// itself), so regenerate it evenly sampled across the final trimmed range
// instead of patching gaps into the original sparse points.
function densifyRoofline(spec: ChartSpec): ChartSpec {
  const [xlo, xhi] = spec.layout.xaxis.range;
  const traces = spec.traces.map((t) => {
    if (t.mode !== 'lines' || !Array.isArray(t.x) || t.x.length < 2) return t;
    const slope = (t.y[1] - t.y[0]) / (t.x[1] - t.x[0]);
    const ceiling = t.y[t.y.length - 1];
    const N = 2000;
    const x: number[] = [];
    const y: number[] = [];
    // achieved bandwidth at each point = throughput / AI; on the diagonal
    // that's just the constant slope, on the plateau it tapers below it as
    // AI grows past the ridge with throughput capped — carried as customdata
    // since hovertemplate can't do arithmetic on %{x}/%{y} itself.
    const customdata: number[][] = [];
    for (let i = 0; i <= N; i++) {
      const xi = xlo + ((xhi - xlo) * i) / N;
      const yi = Math.min(slope * xi, ceiling);
      x.push(xi);
      y.push(yi);
      customdata.push([xi === 0 ? slope : yi / xi]);
    }
    return { ...t, x, y, customdata };
  });
  return { ...spec, traces };
}

function colorRooflineLine(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) =>
    t.mode === 'lines' ? { ...t, line: { ...t.line, color: '#1e3a8a' } } : t
  );
  return { ...spec, traces };
}

// The baked range runs the x-axis out to ~73 FLOP/B and the y-axis out to
// ~9.5 TFLOP/s so the log curve's full compute-bound plateau is visible; on
// a linear axis that leaves most of the panel empty above/right of the
// actual ridge (AI 4.43, 7.09 TFLOP/s) and the measured points near it.
// Trim both to just past the ridge and the forward markers —
// this range feeds densifyRoofline next, so it has to be final by here:
// that's what makes the VPU-only line's horizontal ceiling segment span the
// full panel width instead of stopping at the old, narrower edge.
function trimRoofline(spec: ChartSpec): ChartSpec {
  // draw an explicit axis line (not just gridlines/ticks) along the bottom
  // and left edges of the plot.
  const axisLine = { showline: true, linewidth: 1.5, linecolor: '#6d6860', mirror: false };
  const xaxis = {
    ...spec.layout.xaxis,
    ...axisLine,
    range: [0, 8],
    tickvals: [0, 1, 2, 5, 7],
    ticktext: ['0', '1', '2', '5', '7'],
  };
  const yaxis = {
    ...spec.layout.yaxis,
    ...axisLine,
    range: [0, 8],
    tickvals: [0, 1, 2, 5, 7.091],
    ticktext: ['0', '1', '2', '5', '7.09'],
  };
  return { ...spec, layout: { ...spec.layout, xaxis, yaxis } };
}

// The roofline curve's own hovertemplate rounds AI/TFLOP/s to whole numbers
// (%{x:.0f}/%{y:.0f}) — fine over the original 0.5-to-thousands span, but
// over this zoomed-in view that's only ~8 distinct buckets, so the tooltip
// visibly jumps between them instead of tracking the cursor smoothly along
// the curve. Bump the precision so hovering feels continuous.
function refineRooflineHover(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) =>
    t.mode === 'lines' && typeof t.hovertemplate === 'string'
      ? {
          ...t,
          hovertemplate: t.hovertemplate
            .replace('<b>v6e roofline</b>', '<b>v6e VPU roofline</b>')
            .replace('%{x:.0f}', '%{x:.2f}')
            .replace('%{y:.0f}', '%{y:.2f}')
            .replace('<b>throughput</b>', '<b>compute</b>')
            .replace('TF/s', 'TFLOP/s')
            .replace('<extra></extra>', '<br><b>bandwidth</b>: %{customdata[0]:.2f} TB/s<extra></extra>'),
        }
      : t
  );
  return { ...spec, traces };
}

// All three measured points sit at the same AI (the layer's own 3.45
// FLOP/B) — draw a vertical guide through them instead of repeating "AI:
// 3.45 FLOP/B" in every marker's tooltip. Reads the x position off the
// marker data itself rather than hardcoding 3.45, so it can't drift out of
// sync with the baked spec. The guide stops exactly where it meets the
// roofline (computed from the curve's own slope/ceiling, the same
// piecewise-linear model the curve itself follows), marked with a small dot,
// rather than running the full height of the panel.
// The three measured points' hover lists compute before time (AI / compute /
// time / bandwidth) — swap those two lines so time reads first.
function reorderMarkerHover(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) => {
    if (t.mode !== 'markers' || typeof t.hovertemplate !== 'string') return t;
    const m = t.hovertemplate.match(/(<b>compute<\/b>: [^<]*<br>)(<b>time<\/b>: [^<]*<br>)/);
    if (!m) return t;
    return { ...t, hovertemplate: t.hovertemplate.replace(m[0], m[2] + m[1]) };
  });
  return { ...spec, traces };
}

function addAILine(spec: ChartSpec, aiOverride?: number): ChartSpec {
  const marker = spec.traces.find((t) => t.mode === 'markers' && Array.isArray(t.x));
  const ai = aiOverride ?? marker?.x?.[0];
  const lineTraces = spec.traces.filter((t) => t.mode === 'lines' && Array.isArray(t.x) && t.x.length > 1);
  const line = lineTraces[0];
  const traces = spec.traces.map((t) =>
    t.mode === 'markers' && typeof t.hovertemplate === 'string'
      ? { ...t, hovertemplate: t.hovertemplate.replace(/<b>AI<\/b>: [^<]*<br>/, '') }
      : t
  );
  if (ai == null || !line) return { ...spec, traces };

  const slope = (line.y[1] - line.y[0]) / (line.x[1] - line.x[0]);
  const ceiling = line.y[line.y.length - 1];
  const yAtAI = Math.min(slope * ai, ceiling);

  const shape = {
    type: 'line',
    x0: ai,
    x1: ai,
    yref: 'y',
    y0: spec.layout.yaxis.range[0],
    y1: yAtAI,
    line: { color: '#6d6860', width: 1, dash: 'dot' },
  };
  // label the vertical guide's own x-axis position, just below the axis line.
  const xLabel = {
    x: ai,
    y: 0,
    yref: 'paper',
    yanchor: 'top',
    yshift: -4,
    xanchor: 'center',
    text: ai.toFixed(2),
    showarrow: false,
    font: { size: 11, color: '#6d6860' },
  };
  // Same hover as any other point on the curve — not a special callout —
  // so give it the curve's own (already-refined) hovertemplate and matching
  // customdata instead of bespoke wording.
  const bwAtAI = ai === 0 ? slope : yAtAI / ai;
  const dot = {
    x: [ai],
    y: [yAtAI],
    mode: 'markers',
    marker: { symbol: 'circle', size: 6, color: '#6d6860' },
    showlegend: false,
    hovertemplate: line.hovertemplate,
    customdata: [[bwAtAI]],
  };
  return {
    ...spec,
    traces: [...traces, dot],
    layout: {
      ...spec.layout,
      shapes: [...(spec.layout.shapes ?? []), shape],
      annotations: [...(spec.layout.annotations ?? []), xLabel],
    },
  };
}

// Marks the ridge (where the bandwidth-bound diagonal meets the
// compute-bound plateau) the same way as the AI line: a dot on the curve
// with the curve's own hover — no x-axis label, unlike the AI point.
function addRidgeMarker(spec: ChartSpec): ChartSpec {
  const line = spec.traces.find((t) => t.mode === 'lines' && Array.isArray(t.x) && t.x.length > 1);
  if (!line) return spec;

  const slope = (line.y[1] - line.y[0]) / (line.x[1] - line.x[0]);
  const ceiling = line.y[line.y.length - 1];
  const ridgeX = ceiling / slope;

  const dot = {
    x: [ridgeX],
    y: [ceiling],
    mode: 'markers',
    marker: { symbol: 'circle', size: 6, color: '#6d6860' },
    showlegend: false,
    hovertemplate: line.hovertemplate,
    customdata: [[slope]],
  };
  return { ...spec, traces: [...spec.traces, dot] };
}

export const RooflineChart = () => (
  <PlotChart
    spec={reorderMarkerHover(
      addRidgeMarker(
        addAILine(colorRooflineLine(refineRooflineHover(densifyRoofline(trimRoofline(toLinearAxes(adjustSpecBandwidth(s.roof)))))))
      )
    )}
  />
);
export const XlaCompareFwdChart = () => (
  <PlotChart
    spec={verticalize(
      toDeviceAnnotations(
        addPreOptAnnotation(
          addSpeedupToHover(
            addBandwidthToHover(addBandwidthToHover(fillPreOpt(halfSpec(xlaHoverFixed, 'fwd')), FWD_BW), FWD_PALLAS_BW, 'bandwidth'),
            FWD_DEVICE_US,
            'fwd'
          ),
          'fwd'
        ),
        FWD_DEVICE_US
      )
    )}
  />
);
export const XlaCompareBwdChart = () => (
  <PlotChart
    spec={verticalize(
      toDeviceAnnotations(
        addPreOptAnnotation(
          addSpeedupToHover(
            addBandwidthToHover(addBandwidthToHover(fillPreOpt(halfSpec(xlaHoverFixed, 'bwd')), BWD_BW), BWD_PALLAS_BW, 'bandwidth'),
            BWD_DEVICE_US,
            'bwd'
          ),
          'bwd'
        ),
        BWD_DEVICE_US
      )
    )}
  />
);
// Drops the standalone "full kernel" total bar, keeping just the stacked
// breakdown ("Σ measured parts") — the composition is the point of these
// charts, not a repeat of the total already stated in the caption.
function dropFullKernelBar(spec: ChartSpec): ChartSpec {
  return { ...spec, traces: spec.traces.filter((t) => t.x?.[0] !== 'full kernel') };
}

export const FwdCompositionChart = () => <PlotChart spec={dropFullKernelBar(s.fwdcomp)} />;
export const BwdCompositionChart = () => <PlotChart spec={dropFullKernelBar(s.bwdcomp)} />;
export const FactorialChart = () => <PlotChart spec={s.fact} />;
export const OptLadderChart = () => <PlotChart spec={s.opt} />;

// Hand-authored (not part of the charts.json generator pipeline): a zoomed
// v6e roofline for the forward kernel's shape-sensitivity sweep — same total
// element count (2^23 per B·S·H slab), reshaped across S and H. Numbers are
// straight from the measured table (bytes, AI, BW-roof µs, measured µs, % of
// spec channel roof); TFLOP/s = AI * (1.6 TB/s * roof_us/measured_us), the
// same 1.6 TB/s spec-roof convention Fig 5's roofline already uses.
const CONV_SHAPE_ROOFLINE: ChartSpec = {
  height: 360,
  traces: [
    {
      x: [2.5, 5],
      y: [4, 8],
      mode: 'lines',
      name: 'v6e roofline (1.6 TB/s spec HBM)',
      line: { color: '#6d6860', width: 2 },
      showlegend: false,
      hovertemplate: '<b>v6e roofline</b><br><b>AI</b>: %{x:.2f} FLOP/B<br><b>throughput</b>: %{y:.2f} TF/s<extra></extra>',
    },
    {
      x: [3.45],
      y: [3.941],
      mode: 'markers',
      name: 'B8·S4096·H2048',
      marker: { symbol: 'circle', size: 9, color: '#176b64', line: { width: 2, color: '#2f6f4f' }, opacity: 1 },
      showlegend: false,
      hovertemplate:
        '<b>B8·S4096·H2048</b><br><b>bytes</b>: 260.0 MB<br><b>AI</b>: 3.45 FLOP/B<br><b>BW-roof</b>: 170.4 µs<br><b>measured</b>: 238.7 µs<br><b>% of spec roof</b>: 71.4%<extra></extra>',
    },
    {
      x: [3.39],
      y: [3.9],
      mode: 'markers',
      name: 'B8·S2048·H4096',
      marker: { symbol: 'circle', size: 9, color: '#176b64', line: { width: 2, color: '#2f6f4f' }, opacity: 1 },
      showlegend: false,
      hovertemplate:
        '<b>B8·S2048·H4096</b><br><b>bytes</b>: 264.1 MB<br><b>AI</b>: 3.39 FLOP/B<br><b>BW-roof</b>: 173.0 µs<br><b>measured</b>: 240.6 µs<br><b>% of spec roof</b>: 71.9%<extra></extra>',
    },
    {
      x: [3.29],
      y: [3.808],
      mode: 'markers',
      name: 'B8·S1024·H8192',
      marker: { symbol: 'circle', size: 9, color: '#176b64', line: { width: 2, color: '#2f6f4f' }, opacity: 1 },
      showlegend: false,
      hovertemplate:
        '<b>B8·S1024·H8192</b><br><b>bytes</b>: 272.1 MB<br><b>AI</b>: 3.29 FLOP/B<br><b>BW-roof</b>: 178.3 µs<br><b>measured</b>: 246.5 µs<br><b>% of spec roof</b>: 72.3%<extra></extra>',
    },
  ],
  layout: {
    xaxis: {
      type: 'log',
      title: 'arithmetic intensity (FLOP/B)',
      range: [Math.log10(2.5), Math.log10(5)],
      tickvals: [2.5, 3, 3.5, 4, 4.5, 5],
      ticktext: ['2.5', '3', '3.5', '4', '4.5', '5'],
    },
    yaxis: {
      type: 'log',
      title: 'achieved TFLOP/s',
      range: [Math.log10(3), Math.log10(7)],
      tickvals: [3, 4, 5, 6, 7],
      ticktext: ['3', '4', '5', '6', '7'],
    },
    showlegend: false,
  },
};
export const ConvShapeRooflineChart = () => <PlotChart spec={CONV_SHAPE_ROOFLINE} />;
// Just the share on each wedge (full name + count stays in the hover card).
function labelPieDirectly(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) => (t.type === 'pie' ? { ...t, textinfo: 'percent' } : t));
  return { ...spec, traces };
}
export const FwdOpsPieChart = () => <PlotChart spec={labelPieDirectly(s.fwd_ops_pie)} />;
