// Interactive measured figures for the linear-attention-forward section of the TPU post.
// Specs are baked from the measured JSONs by gen_blog_figures.py in the
// accelerated-model-architectures repo (benchmarks/linear_attention/);
// do not hand-edit numbers here — re-run the generator.
import specs from './la/charts.json';
import PlotChart, { type ChartSpec } from '../PlotChart';

const s = specs as Record<string, ChartSpec>;

// The baked bandwidth bar charts use a log y-axis; show them on a linear one
// instead, sharing one 0–1.7 TB/s range so the copy roof lines up across them.
// The "did not compile" / "OOM" placeholder bars were sized for the log axis
// (0.3 TB/s); on a linear axis that reads as a real measurement, so shrink them
// to a stub that just carries their label.
const PLACEHOLDER_STUB_TBPS = 0.04;
function toLinearBandwidth(spec: ChartSpec): ChartSpec {
  const traces = spec.traces.map((t) =>
    t.marker?.color === 'rgba(0,0,0,0)' && Array.isArray(t.y)
      ? { ...t, y: t.y.map((v: number | null) => (v == null ? v : PLACEHOLDER_STUB_TBPS)) }
      : t
  );
  const yaxis = { ...spec.layout.yaxis, type: 'linear', title: 'bandwidth (TB/s)', range: [0, 1.7] };
  return { ...spec, traces, layout: { ...spec.layout, yaxis } };
}

export const LaScanVsKernelChart = () => <PlotChart spec={s.laxla} />;
export const LaOpCensusChart = () => <PlotChart spec={s.laopscmp} />;
export const LaKernelLadderChart = () => <PlotChart spec={s.laladder} />;
export const LaFwdNoneChart = () => <PlotChart spec={s.lafwd_none} />;
export const LaFwdScalarChart = () => <PlotChart spec={s.lafwd_scalar} />;
export const LaFwdDiagonalChart = () => <PlotChart spec={s.lafwd_diagonal} />;
export const LaOptLadderChart = () => <PlotChart spec={s.laopt} />;
export const LaRooflineChart = () => <PlotChart spec={s.laroof} />;
export const LaSpeedChart = () => <PlotChart spec={toLinearBandwidth(s.laspeed)} />;
export const LaStatePassingChart = () => <PlotChart spec={toLinearBandwidth(s.lasp)} />;
export const LaBwdCoreChart = () => <PlotChart spec={toLinearBandwidth(s.labwdcore)} />;
// hand-added (Part 5): the real-layer training step, before vs after, from benchmarks/la_opt/layer_breakdown.json
export const LaLayerStepChart = () => <PlotChart spec={s.lalayer} />;
// the same layer with its depthwise causal conv (no conv / XLA conv / Pallas conv), from benchmarks/la_opt/update_layer_conv_fig.py
export const LaLayerConvStepChart = () => <PlotChart spec={s.lalayerconv} />;
// one training step of the layer per part and pass: no kernels / linear-attention kernels / all kernels, from benchmarks/la_opt/update_layer_ops_fig.py
export const LaLayerOpsChart = () => <PlotChart spec={s.lalayerops} />;
// FLAT on TPU v6e vs FLA (Triton) on H100, forward and backward device time stacked, from benchmarks/la_opt/update_h100_fig.py
export const LaH100Chart = () => <PlotChart spec={s.lah100} />;
