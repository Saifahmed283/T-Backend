"""
Minimal from-scratch tokenizer for Morphe.

No external tokenizer library, no pretrained vocab (no BPE merges downloaded
from anywhere) — this builds its own word-level vocabulary directly from
the training data, which is what "trained from zero" means in practice.
"""
import json
import re
from collections import Counter

PAD, UNK, CLS = "<pad>", "<unk>", "<cls>"
SPECIAL_TOKENS = [PAD, UNK, CLS]


def basic_tokenize(text: str):
    text = text.lower().strip()
    # keep words and standalone punctuation as tokens
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?|[^\sa-z0-9]", text)


class Tokenizer:
    def __init__(self, vocab: dict | None = None):
        self.vocab = vocab or {}
        self.inv_vocab = {i: t for t, i in self.vocab.items()}

    @classmethod
    def build_from_file(cls, jsonl_path: str, min_freq: int = 1):
        counter = Counter()
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                counter.update(basic_tokenize(row["text"]))

        vocab = {tok: i for i, tok in enumerate(SPECIAL_TOKENS)}
        for tok, freq in counter.most_common():
            if freq >= min_freq and tok not in vocab:
                vocab[tok] = len(vocab)
        return cls(vocab)

    def encode(self, text: str, max_len: int = 24):
        tokens = [CLS] + basic_tokenize(text)
        ids = [self.vocab.get(t, self.vocab[UNK]) for t in tokens][:max_len]
        attn_mask = [1] * len(ids)
        while len(ids) < max_len:
            ids.append(self.vocab[PAD])
            attn_mask.append(0)
        return ids, attn_mask

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.vocab, f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: str):
        with open(path, "r", encoding="utf-8") as f:
            vocab = json.load(f)
        return cls(vocab)

    @property
    def vocab_size(self):
        return len(self.vocab)

    @property
    def pad_id(self):
        return self.vocab[PAD]
