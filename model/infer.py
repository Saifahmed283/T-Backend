"""
Loads the trained Morphe model and classifies a piece of text into an intent.
No external API call — pure local forward pass through the trained weights.
"""
import json
import os

import torch

from model.tokenizer import Tokenizer
from model.transformer import MorpheEncoder

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "model")


class MorpheClassifier:
    def __init__(self, model_dir: str = MODEL_DIR):
        with open(os.path.join(model_dir, "config.json")) as f:
            self.config = json.load(f)
        with open(os.path.join(model_dir, "labels.json")) as f:
            self.labels = json.load(f)

        self.tokenizer = Tokenizer.load(os.path.join(model_dir, "vocab.json"))

        self.model = MorpheEncoder(
            vocab_size=self.config["vocab_size"],
            num_intents=self.config["num_intents"],
            d_model=self.config["d_model"],
            n_heads=self.config["n_heads"],
            n_layers=self.config["n_layers"],
            d_ff=self.config["d_ff"],
            max_len=self.config["max_len"],
            pad_id=self.config["pad_id"],
        )
        state = torch.load(os.path.join(model_dir, "checkpoint.pt"), map_location="cpu")
        self.model.load_state_dict(state)
        self.model.eval()

    @torch.no_grad()
    def predict(self, text: str, allowed_intents: list[str] | None = None, top_k: int = 3):
        ids, mask = self.tokenizer.encode(text, self.config["max_len"])
        ids_t = torch.tensor([ids], dtype=torch.long)
        mask_t = torch.tensor([mask], dtype=torch.long)

        logits = self.model(ids_t, mask_t)[0]
        probs = torch.softmax(logits, dim=-1)

        if allowed_intents:
            # contextual masking: only consider intents valid for the
            # current dialogue state, renormalize over just those
            allowed_ids = [self.labels.index(i) for i in allowed_intents if i in self.labels]
            masked = torch.full_like(probs, float("-inf"))
            masked[allowed_ids] = logits[allowed_ids]
            probs = torch.softmax(masked, dim=-1)

        ranked = sorted(
            ((self.labels[i], probs[i].item()) for i in range(len(self.labels))),
            key=lambda x: -x[1],
        )
        return ranked[:top_k]


if __name__ == "__main__":
    clf = MorpheClassifier()
    test_sentences = [
        "I have an idea for a youth mentorship program",
        "we'd like to fund projects like yours",
        "how does your gate system work",
        "just looking around for now",
        "it's basically ready and already has users",
        "no rush, just exploring options",
        "here's my email: me@example.com",
    ]
    for s in test_sentences:
        print(f"{s!r:55s} -> {clf.predict(s, top_k=2)}")
