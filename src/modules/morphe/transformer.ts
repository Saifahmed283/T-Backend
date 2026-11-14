/**
 * Morphe encoder inference - ported from model/transformer.py.
 * Pure JavaScript forward pass. No PyTorch, no ONNX, no external deps.
 *
 * Weights are loaded from a JSON artifact (see scripts/convert-model.py).
 * Architecture: token + positional embeddings -> N encoder layers ->
 * [CLS] pooled -> linear classifier head.
 * Inference mode: dropout is disabled.
 */

type LayerNormParams = {
  weight: number[];
  bias: number[];
  eps: number;
};

type LinearParams = {
  weight: number[][]; // [out][in]
  bias: number[];
};

type AttentionParams = {
  qWeight: number[][];
  kWeight: number[][];
  vWeight: number[][];
  qBias: number[];
  kBias: number[];
  vBias: number[];
  outWeight: number[][];
  outBias: number[];
};

type EncoderLayerParams = {
  selfAttn: AttentionParams;
  linear1: LinearParams;
  linear2: LinearParams;
  norm1: LayerNormParams;
  norm2: LayerNormParams;
};

type ModelWeights = {
  tokenEmb: number[][]; // [vocab][d_model]
  posEmb: number[][]; // [max_len][d_model]
  layers: EncoderLayerParams[];
  normWeight: number[];
  normBias: number[];
  classifier1Weight: number[][];
  classifier1Bias: number[];
  classifier2Weight: number[][];
  classifier2Bias: number[];
  config: {
    vocabSize: number;
    numIntents: number;
    dModel: number;
    nHeads: number;
    nLayers: number;
    dFf: number;
    maxLen: number;
    padId: number;
  };
};

function matVec(weight: number[][], bias: number[], x: number[]): number[] {
  const out: number[] = new Array(weight.length).fill(0);
  for (let i = 0; i < weight.length; i++) {
    let sum = bias[i];
    const row = weight[i];
    for (let j = 0; j < x.length; j++) sum += row[j] * x[j];
    out[i] = sum;
  }
  return out;
}

function matMat(weight: number[][], x: number[][]): number[][] {
  return x.map((row) => matVec(weight, new Array(weight.length).fill(0), row));
}

function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
}

function softmax(logits: number[]): number[] {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  let sum = 0;
  const out: number[] = new Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < logits.length; i++) out[i] /= sum;
  return out;
}

function layerNorm(x: number[], params: LayerNormParams): number[] {
  const n = x.length;
  const mean = x.reduce((a, b) => a + b, 0) / n;
  const variance = x.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  const invStd = 1 / Math.sqrt(variance + params.eps);
  return x.map((v, i) => (v - mean) * invStd * params.weight[i] + params.bias[i]);
}

function linear(x: number[], params: LinearParams): number[] {
  return matVec(params.weight, params.bias, x);
}

function multiHeadSelfAttention(
  x: number[][],
  params: AttentionParams,
  keyPaddingMask: boolean[],
  nHeads: number,
): number[][] {
  const seqLen = x.length;
  const dModel = x[0].length;
  const headDim = dModel / nHeads;

  const Q = matMat(params.qWeight, x).map((row) => row.map((v, j) => v + params.qBias[j]));
  const K = matMat(params.kWeight, x).map((row) => row.map((v, j) => v + params.kBias[j]));
  const V = matMat(params.vWeight, x).map((row) => row.map((v, j) => v + params.vBias[j]));

  const splitHeads = (t: number[][]): number[][][] =>
    t.map((row) => {
      const heads: number[][] = [];
      for (let h = 0; h < nHeads; h++) heads.push(row.slice(h * headDim, (h + 1) * headDim));
      return heads;
    });

  const Qh = splitHeads(Q);
  const Kh = splitHeads(K);
  const Vh = splitHeads(V);

  const scale = 1 / Math.sqrt(headDim);
  const outHeads: number[][][] = [];

  for (let h = 0; h < nHeads; h++) {
    const q = Qh.map((row) => row[h]);
    const k = Kh.map((row) => row[h]);
    const v = Vh.map((row) => row[h]);

    const scores: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        let s = 0;
        for (let d = 0; d < headDim; d++) s += q[i][d] * k[j][d];
        row.push(s * scale);
      }
      for (let j = 0; j < seqLen; j++) if (keyPaddingMask[j]) row[j] = -Infinity;
      scores.push(row);
    }

    const attn = scores.map((row) => softmax(row));

    const headOut: number[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const outVec: number[] = new Array(headDim).fill(0);
      for (let j = 0; j < seqLen; j++) {
        const w = attn[i][j];
        if (w === 0) continue;
        for (let d = 0; d < headDim; d++) outVec[d] += w * v[j][d];
      }
      headOut.push(outVec);
    }
    outHeads.push(headOut);
  }

  const concatenated: number[][] = [];
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    for (let h = 0; h < nHeads; h++) row.push(...outHeads[h][i]);
    concatenated.push(row);
  }

  return matMat(params.outWeight, concatenated).map((row) =>
    row.map((v, j) => v + params.outBias[j]),
  );
}

function encoderLayer(
  x: number[][],
  params: EncoderLayerParams,
  keyPaddingMask: boolean[],
  nHeads: number,
): number[][] {
  const attnOut = multiHeadSelfAttention(x, params.selfAttn, keyPaddingMask, nHeads);
  const residual1 = attnOut.map((row, i) => row.map((v, j) => v + x[i][j]));
  const norm1Out = residual1.map((row) => layerNorm(row, params.norm1));

  const ff1 = norm1Out.map((row) => linear(row, params.linear1).map(gelu));
  const ff2 = ff1.map((row) => linear(row, params.linear2));
  const residual2 = ff2.map((row, i) => row.map((v, j) => v + norm1Out[i][j]));
  return residual2.map((row) => layerNorm(row, params.norm2));
}

export class MorpheEncoder {
  readonly weights: ModelWeights;
  readonly config: ModelWeights["config"];

  constructor(weights: ModelWeights) {
    this.weights = weights;
    this.config = weights.config;
  }

  /**
   * Forward pass. inputIds: [batch, seq], attentionMask: [batch, seq].
   * Returns logits: [batch, numIntents].
   */
  forward(inputIds: number[][], attentionMask: number[][]): number[][] {
    const { dModel } = this.config;
    const batch = inputIds.length;
    const seqLen = inputIds[0].length;

    // Embeddings
    const embedded: number[][][] = [];
    for (let b = 0; b < batch; b++) {
      const seq: number[][] = [];
      for (let t = 0; t < seqLen; t++) {
        const tokEmb = this.weights.tokenEmb[inputIds[b][t]];
        const posEmb = this.weights.posEmb[t];
        const combined: number[] = [];
        for (let d = 0; d < dModel; d++) combined.push((tokEmb[d] + posEmb[d]) * Math.sqrt(dModel));
        seq.push(combined);
      }
      embedded.push(seq);
    }

    // Encoder layers
    let x: number[][][] = embedded;
    for (const layer of this.weights.layers) {
      const keyPaddingMask = attentionMask.map((row) => row.map((m) => m === 0))[0];
      x = x.map((seq) => encoderLayer(seq, layer, keyPaddingMask, this.config.nHeads));
    }

    // Final norm
    const normParams = { weight: this.weights.normWeight, bias: this.weights.normBias, eps: 1e-5 };
    x = x.map((seq) => seq.map((row) => layerNorm(row, normParams)));

    // [CLS] pooled -> classifier
    const clsRepr = x.map((seq) => seq[0]);
    const hidden = clsRepr.map((row) =>
      linear(row, { weight: this.weights.classifier1Weight, bias: this.weights.classifier1Bias }).map(gelu),
    );
    return hidden.map((row) =>
      linear(row, { weight: this.weights.classifier2Weight, bias: this.weights.classifier2Bias }),
    );
  }
}

export function loadWeights(json: string): ModelWeights {
  return JSON.parse(json) as ModelWeights;
}
