/**
 * Morphe tokenizer - ported from model/tokenizer.py.
 * Minimal from-scratch word-level tokenizer, no external libraries.
 */
const PAD = "<pad>";
const UNK = "unknown";
const CLS = "<cls>";
const SPECIAL_TOKENS = [PAD, UNK, CLS];

function basicTokenize(text: string): string[] {
  const lowered = text.toLowerCase().trim();
  // keep words and standalone punctuation as tokens
  const tokens: string[] = [];
  const re = /[a-z0-9]+(?:'[a-z]+)?|[^\sa-z0-9]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(lowered)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

export interface Tokenizer {
  vocab: Record<string, number>;
  invVocab: Record<number, string>;
  encode(text: string, maxLen?: number): { ids: number[]; mask: number[] };
  vocabSize(): number;
  padId(): number;
}

export function buildTokenizer(vocab: Record<string, number>): Tokenizer {
  const invVocab: Record<number, string> = {};
  for (const [tok, i] of Object.entries(vocab)) {
    invVocab[i] = tok;
  }

  return {
    vocab,
    invVocab,
    encode(text, maxLen = 24) {
      const tokens = [CLS, ...basicTokenize(text)];
      const ids = tokens.map((t) => (t in vocab ? vocab[t] : vocab[UNK])).slice(0, maxLen);
      const mask = ids.map(() => 1);
      while (ids.length < maxLen) {
        ids.push(vocab[PAD]);
        mask.push(0);
      }
      return { ids, mask };
    },
    vocabSize() {
      return Object.keys(vocab).length;
    },
    padId() {
      return vocab[PAD];
    },
  };
}

export function loadTokenizer(json: string): Tokenizer {
  return buildTokenizer(JSON.parse(json));
}

export { PAD, UNK, CLS, basicTokenize };
