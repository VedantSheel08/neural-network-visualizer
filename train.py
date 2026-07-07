"""Train a tiny MNIST classifier (784 -> 16 -> 16 -> 10) and export weights.json.

Input normalization: pixels scaled to [0, 1] (plain ToTensor, no mean/std shift)
so the browser-side pipeline is simply pixel/255.
"""

import json
import os

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "mnist-data")
OUT_PATH = os.path.join(HERE, "weights.json")


class TinyNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 64)
        self.fc2 = nn.Linear(64, 48)
        self.fc3 = nn.Linear(48, 32)
        self.fc4 = nn.Linear(32, 16)
        self.fc5 = nn.Linear(16, 10)

    def forward(self, x):
        x = x.view(x.size(0), -1)
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = torch.relu(self.fc4(x))
        return self.fc5(x)  # logits; softmax applied at inference


def main():
    torch.manual_seed(7)
    tfm = transforms.ToTensor()  # [0, 1], no mean/std normalization
    train_ds = datasets.MNIST(DATA_DIR, train=True, download=True, transform=tfm)
    test_ds = datasets.MNIST(DATA_DIR, train=False, download=True, transform=tfm)
    train_dl = DataLoader(train_ds, batch_size=128, shuffle=True)
    test_dl = DataLoader(test_ds, batch_size=512)

    model = TinyNet()
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(8):
        model.train()
        for xb, yb in train_dl:
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            opt.step()

        model.eval()
        correct = total = 0
        with torch.no_grad():
            for xb, yb in test_dl:
                pred = model(xb).argmax(dim=1)
                correct += (pred == yb).sum().item()
                total += yb.size(0)
        print(f"epoch {epoch + 1}: test accuracy {correct / total:.4f}", flush=True)

    layers = []
    for fc in (model.fc1, model.fc2, model.fc3, model.fc4, model.fc5):
        layers.append({
            # weight shape [out, in]: weights[i][j] connects input j -> output i
            "weights": [[round(w, 6) for w in row] for row in fc.weight.tolist()],
            "biases": [round(b, 6) for b in fc.bias.tolist()],
        })

    with open(OUT_PATH, "w") as f:
        json.dump({"layers": layers}, f)
    print(f"wrote {OUT_PATH} ({os.path.getsize(OUT_PATH)} bytes)")
    print(f"final test accuracy: {correct / total:.4f}")


if __name__ == "__main__":
    main()
