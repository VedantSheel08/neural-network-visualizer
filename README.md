# Forward Pass — Live Neural Network Inference Visualizer

Draw a digit, hit **Run**, and watch a real trained MNIST classifier light up
layer by layer in 3D. Every pulse, glow, and fiber thickness is driven by an
actual forward pass running in your browser — swap in a differently trained
`weights.json` and the animation behaves completely differently, because it is
reading real numbers, not replaying choreography.

## Architecture

- **Model**: `784 → 16 (ReLU) → 16 (ReLU) → 10 (softmax)`, ~13k parameters,
  trained to 94.1% test accuracy with `train.py` (PyTorch). Weights exported to
  `public/model/weights.json` (~130 KB).
- **Inference**: `lib/inference.ts` — pure TypeScript matrix math, no ML
  library. Returns every intermediate layer's pre-activations (z) and
  activations (a) so the propagation animation is stage-accurate.
- **Preprocessing**: `lib/preprocess.ts` reproduces MNIST's normalization
  (crop to ink, scale to a 20×20 box, center by center of mass in 28×28) —
  this matters far more than model size for perceived accuracy.
- **Scene**: react-three-fiber. Hidden/output nodes are instanced spheres;
  connections are instanced cylinders with a custom shader — radius and
  brightness ∝ |weight × upstream activation|, with a white-hot wavefront
  traveling source→target during each propagation stage. Cyan fibers carry
  excitatory signal, dim slate ones inhibitory. The input layer is the drawn
  28×28 image itself, textured onto a plane entering the pipeline.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (static, deployable to Vercel as-is)
```

## Retrain

```bash
pip install torch torchvision
python train.py   # writes weights.json — copy to public/model/weights.json
```

Accessibility: touch draw pad, visible focus states, and
`prefers-reduced-motion` (propagation renders instantly instead of animating).
