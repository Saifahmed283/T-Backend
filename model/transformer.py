"""
Morphe's intent/slot encoder — a small transformer built and trained
entirely from scratch in PyTorch. No pretrained weights, no external
API calls. Architecture: learned token + positional embeddings ->
N transformer encoder layers -> [CLS] pooled -> linear classifier head.

Small on purpose: with a few hundred training examples, a few layers
and a modest hidden size generalize far better than a large model would
(which would just memorize/overfit the tiny dataset).
"""
import math
import torch
import torch.nn as nn


class MorpheEncoder(nn.Module):
    def __init__(
        self,
        vocab_size: int,
        num_intents: int,
        d_model: int = 64,
        n_heads: int = 4,
        n_layers: int = 2,
        d_ff: int = 128,
        max_len: int = 24,
        dropout: float = 0.1,
        pad_id: int = 0,
    ):
        super().__init__()
        self.pad_id = pad_id
        self.token_emb = nn.Embedding(vocab_size, d_model, padding_idx=pad_id)
        self.pos_emb = nn.Embedding(max_len, d_model)
        self.emb_dropout = nn.Dropout(dropout)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            batch_first=True,
            activation="gelu",
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.norm = nn.LayerNorm(d_model)
        self.classifier = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, num_intents),
        )
        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor):
        B, T = input_ids.shape
        positions = torch.arange(T, device=input_ids.device).unsqueeze(0).expand(B, T)

        x = self.token_emb(input_ids) * math.sqrt(self.token_emb.embedding_dim)
        x = x + self.pos_emb(positions)
        x = self.emb_dropout(x)

        key_padding_mask = attention_mask == 0  # True where padded
        x = self.encoder(x, src_key_padding_mask=key_padding_mask)
        x = self.norm(x)

        cls_repr = x[:, 0, :]  # pooled [CLS] representation
        logits = self.classifier(cls_repr)
        return logits
