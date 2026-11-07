"""
Convert Morphe's PyTorch checkpoint (checkpoint.pt) to a JSON artifact
that the TypeScript inference engine can load directly.

Run once (requires Python + torch):
    python scripts/convert_model.py

Produces:
    model/weights.json   -- full model weights + vocab + config
    model/labels.json    -- intent labels (copy of existing)
    model/vocab.json     -- tokenizer vocab (copy of existing)

After conversion, the Fastify backend will use the neural model
automatically instead of the keyword fallback classifier.
"""
import json
import os
import sys

import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "model")
CHECKPOINT = os.path.join(MODEL_DIR, "checkpoint.pt")
OUT = os.path.join(MODEL_DIR, "weights.json")


def tensor_to_list(t):
    return t.detach().cpu().tolist()


def main():
    if not os.path.exists(CHECKPOINT):
        print(f"Checkpoint not found at {CHECKPOINT}")
        sys.exit(1)

    with open(os.path.join(MODEL_DIR, "config.json")) as f:
        config = json.load(f)
    with open(os.path.join(MODEL_DIR, "labels.json")) as f:
        labels = json.load(f)
    with open(os.path.join(MODEL_DIR, "vocab.json")) as f:
        vocab = json.load(f)

    state = torch.load(CHECKPOINT, map_location="cpu")

    weights = {
        "vocab": vocab,
        "config": config,
        "tokenEmb": tensor_to_list(state["token_emb.weight"]),
        "posEmb": tensor_to_list(state["pos_emb.weight"]),
        "normWeight": tensor_to_list(state["norm.weight"]),
        "normBias": tensor_to_list(state["norm.bias"]),
        "classifier1Weight": tensor_to_list(state["classifier.0.weight"]),
        "classifier1Bias": tensor_to_list(state["classifier.0.bias"]),
        "classifier2Weight": tensor_to_list(state["classifier.3.weight"]),
        "classifier2Bias": tensor_to_list(state["classifier.3.bias"]),
        "layers": [],
    }

    n_layers = config["n_layers"]
    for i in range(n_layers):
        prefix = f"encoder.layers.{i}"
        layer = {
            "selfAttn": {
                "qWeight": tensor_to_list(state[f"{prefix}.self_attn.in_proj_weight"][0:64]),
                "kWeight": tensor_to_list(state[f"{prefix}.self_attn.in_proj_weight"][64:128]),
                "vWeight": tensor_to_list(state[f"{prefix}.self_attn.in_proj_weight"][128:192]),
                "qBias": tensor_to_list(state[f"{prefix}.self_attn.in_proj_bias"][0:64]),
                "kBias": tensor_to_list(state[f"{prefix}.self_attn.in_proj_bias"][64:128]),
                "vBias": tensor_to_list(state[f"{prefix}.self_attn.in_proj_bias"][128:192]),
                "outWeight": tensor_to_list(state[f"{prefix}.self_attn.out_proj.weight"]),
                "outBias": tensor_to_list(state[f"{prefix}.self_attn.out_proj.bias"]),
            },
            "linear1": {
                "weight": tensor_to_list(state[f"{prefix}.linear1.weight"]),
                "bias": tensor_to_list(state[f"{prefix}.linear1.bias"]),
            },
            "linear2": {
                "weight": tensor_to_list(state[f"{prefix}.linear2.weight"]),
                "bias": tensor_to_list(state[f"{prefix}.linear2.bias"]),
            },
            "norm1": {
                "weight": tensor_to_list(state[f"{prefix}.norm1.weight"]),
                "bias": tensor_to_list(state[f"{prefix}.norm1.bias"]),
            },
            "norm2": {
                "weight": tensor_to_list(state[f"{prefix}.norm2.weight"]),
                "bias": tensor_to_list(state[f"{prefix}.norm2.bias"]),
            },
        }
        weights["layers"].append(layer)

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(weights, f)

    print(f"Wrote {OUT}")
    print(f"Vocab size: {config['vocab_size']}, Intents: {config['num_intents']}")
    print(f"Layers: {n_layers}, d_model: {config['d_model']}")


if __name__ == "__main__":
    main()
