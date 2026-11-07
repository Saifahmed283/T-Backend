/**
 * MorpheClassifier - hybrid intent prediction for the dialogue flow.
 *
 * Combines the trained neural transformer with a deterministic keyword
 * fallback. The neural model handles phrasing variety; the keyword rules
 * catch high-signal terms the small dataset can't generalize to.
 *
 * Confidence threshold: if the neural model's top prediction is below
 * 0.55, the keyword classifier takes over. This prevents confident
 * misclassifications on out-of-distribution phrases.
 *
 * Two modes:
 *  1. "hybrid" (default) - neural + keyword fallback
 *  2. "keyword" - deterministic only (no model file needed)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTokenizer } from "./tokenizer.js";
import { MorpheEncoder } from "./transformer.js";

const ROOT = join(process.cwd(), "model");
const WEIGHTS_PATH = join(ROOT, "weights.json");
const CONFIDENCE_THRESHOLD = 0.55;

const KEYWORD_RULES: Record<string, RegExp[]> = {
  new_idea: [/idea/, /pitch/, /startup/, /project/, /concept/, /initiative/, /building/, /bring.*to you/],
  partner_inquiry: [/partner/, /funder/, /collaborate/, /alliance/, /invest/, /funding/, /sponsor/],
  general_question: [/how/, /what/, /why/, /explain/, /question/, /tell me/],
  just_browsing: [/browsing/, /looking around/, /checking things/, /just looking/],
  sector_named: [/education/, /climate/, /health/, /livelihood/, /governance/, /agriculture/, /fintech/, /healthcare/, /social/],
  stage_concept: [/concept/, /early/, /just starting/, /idea stage/, /raw/],
  stage_tested: [/tested/, /pilot/, /validation/, /informally/, /small version/],
  stage_running: [/running/, /live/, /users/, /revenue/, /operating/, /already/],
  timeline_urgent: [/urgent/, /fast/, /soon/, /asap/, /rush/, /hurry/],
  timeline_quarter: [/quarter/, /three months/, /3 months/, /few months/],
  timeline_exploratory: [/exploratory/, /sometime/, /later/, /no rush/, /exploring/],
  contact_given: [/email/, /@/, /phone/, /contact me/, /reach out/, /here.s my/],
  contact_declined: [/no.*email/, /rather not/, /skip/, /private/, /don.t want/],
  done_asking: [/done/, /that.s all/, /thanks/, /thank you/],
  partner_named: [/funder/, /government/, /consultancy/, /ngo/, /agency/],
  unsure_partner: [/unsure/, /not sure/, /maybe/],
  unsure_sector: [/unsure/, /not sure/],
  question_methodology: [/methodology/, /ldia/, /locate/, /design/, /implement/, /assure/, /architecture/],
  question_services: [/service/, /advisory/, /what do you do/],
  question_about: [/about/, /who are you/, /terramorph/],
  question_partners: [/partner/, /partnership/],
  question_contact: [/contact/, /reach.*team/],
};

function keywordScore(text: string, intent: string): number {
  const rules = KEYWORD_RULES[intent];
  if (!rules) return 0;
  let score = 0;
  for (const re of rules) if (re.test(text)) score += 1;
  return score;
}

function softmax(logits: number[]): number[] {
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  let sum = 0;
  const out = new Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < logits.length; i++) out[i] /= sum;
  return out;
}

const LABELS = [
  "contact_declined",
  "contact_given",
  "done_asking",
  "general_question",
  "just_browsing",
  "new_idea",
  "partner_inquiry",
  "partner_named",
  "question_about",
  "question_contact",
  "question_methodology",
  "question_partners",
  "question_services",
  "sector_named",
  "stage_concept",
  "stage_running",
  "stage_tested",
  "timeline_exploratory",
  "timeline_quarter",
  "timeline_urgent",
  "unsure_partner",
  "unsure_sector",
];

export class NeuralMorpheClassifier implements MorpheClassifier {
  readonly labels: string[];
  private tokenizer: ReturnType<typeof buildTokenizer>;
  private model: MorpheEncoder;

  constructor(tokenizer: ReturnType<typeof buildTokenizer>, model: MorpheEncoder, labels: string[]) {
    this.tokenizer = tokenizer;
    this.model = model;
    this.labels = labels;
  }

  predict(text: string, allowedIntents: readonly string[] = [], topK = 3): MorphePrediction[] {
    const maxLen = this.model.config.maxLen;
    const { ids, mask } = this.tokenizer.encode(text, maxLen);
    const logits = this.model.forward([ids], [mask])[0];
    const probs = softmax(logits);

    const ranked = this.labels.map((intent, i) => ({ intent, confidence: probs[i] })).sort((a, b) => b.confidence - a.confidence);

    if (allowedIntents.length > 0) {
      const allowedSet = new Set(allowedIntents);
      const filtered = ranked.filter((p) => allowedSet.has(p.intent));
      if (filtered.length > 0) {
        const total = filtered.reduce((s, p) => s + p.confidence, 0);
        return filtered.map((p) => ({ intent: p.intent, confidence: p.confidence / total })).slice(0, topK);
      }
    }
    return ranked.slice(0, topK);
  }

  predictWithConfidence(text: string, allowedIntents: readonly string[] = []): { intent: string; confidence: number } {
    const predictions = this.predict(text, allowedIntents, 1);
    return predictions[0] ?? { intent: "fallback", confidence: 0 };
  }
}

export class KeywordMorpheClassifier implements MorpheClassifier {
  readonly labels: string[];

  constructor(labels: string[]) {
    this.labels = labels;
  }

  predict(text: string, allowedIntents: readonly string[] = [], topK = 3): MorphePrediction[] {
    const lower = text.toLowerCase();
    const scored = this.labels.map((intent) => ({ intent, confidence: keywordScore(lower, intent) }));
    const filtered = allowedIntents.length > 0 ? scored.filter((s) => allowedIntents.includes(s.intent)) : scored;
    const withScore = filtered.filter((s) => s.confidence > 0);
    const sorted = withScore.sort((a, b) => b.confidence - a.confidence);
    const top = sorted.slice(0, topK);
    const maxConf = top.length > 0 ? top[0].confidence : 1;
    return top.map((s) => ({ intent: s.intent, confidence: maxConf > 0 ? s.confidence / maxConf : 0 }));
  }

  predictWithConfidence(text: string, allowedIntents: readonly string[] = []): { intent: string; confidence: number } {
    const predictions = this.predict(text, allowedIntents, 1);
    return predictions[0] ?? { intent: "fallback", confidence: 0 };
  }
}

/**
 * Hybrid classifier: neural first, keyword fallback when confidence is low.
 */
export class HybridMorpheClassifier implements MorpheClassifier {
  readonly labels: string[];
  private neural: NeuralMorpheClassifier;
  private keyword: KeywordMorpheClassifier;

  constructor(neural: NeuralMorpheClassifier, keyword: KeywordMorpheClassifier, labels: string[]) {
    this.neural = neural;
    this.keyword = keyword;
    this.labels = labels;
  }

  predict(text: string, allowedIntents: readonly string[] = [], topK = 3): MorphePrediction[] {
    const neuralPred = this.neural.predictWithConfidence(text, allowedIntents);

    // If neural is confident enough, use it
    if (neuralPred.confidence >= CONFIDENCE_THRESHOLD) {
      return this.neural.predict(text, allowedIntents, topK);
    }

    // Otherwise fall back to keyword
    const keywordPred = this.keyword.predictWithConfidence(text, allowedIntents);

    // If keyword found something, use it
    if (keywordPred.confidence > 0) {
      return this.keyword.predict(text, allowedIntents, topK);
    }

    // Neither worked - use neural's best guess (better than random)
    return this.neural.predict(text, allowedIntents, topK);
  }
}

export interface MorpheClassifier {
  predict(text: string, allowedIntents?: readonly string[], topK?: number): MorphePrediction[];
  labels: string[];
}

export interface MorphePrediction {
  intent: string;
  confidence: number;
}

let cachedClassifier: MorpheClassifier | null = null;

export function createClassifier(): MorpheClassifier {
  if (cachedClassifier) return cachedClassifier;

  try {
    const weightsJson = readFileSync(WEIGHTS_PATH, "utf-8");
    const weights = JSON.parse(weightsJson);
    const tokenizer = buildTokenizer(weights.vocab);
    const model = new MorpheEncoder(weights);
    const neural = new NeuralMorpheClassifier(tokenizer, model, LABELS);
    const keyword = new KeywordMorpheClassifier(LABELS);
    cachedClassifier = new HybridMorpheClassifier(neural, keyword, LABELS);
    return cachedClassifier;
  } catch {
    // No weights file -> keyword fallback
    cachedClassifier = new KeywordMorpheClassifier(LABELS);
    return cachedClassifier;
  }
}
