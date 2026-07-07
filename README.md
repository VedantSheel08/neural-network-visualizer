# vedant sheel · neural network

a real trained digit classifier running live in your browser, drawn as an
interactive 3d network. draw a number, hit run, watch the actual math happen,
then hover and click anything to check it.

## the network

`784 → 64 → 48 → 32 → 16 → 10`, 55,626 parameters, 96.9% accurate on digits
it never saw. trained with `train.py` (pytorch, ~2 min on a laptop cpu),
weights exported to `public/model/weights.json` (~560 kb). the forward pass
is plain typescript in `lib/inference.ts`. no ml library, no server.

## what you can do on the page

- draw and run: staged propagation animation driven by the real activations
- hover any neuron or connection: its live value
- click a neuron: its weights (first layer shows them as a 28×28 image),
  its weighted sum, its output, and a slider to force its activation and
  watch everything downstream recompute
- click a connection: that one weight and what it's carrying right now
- speed slider + one-layer-at-a-time step mode
- inline quizzes, hover definitions for every jargon term, links to the
  original papers (lecun 1998, rumelhart 1986, kingma & ba 2014, etc.),
  a glossary, and a reading list
- light/dark toggle (persisted), reduced-motion support throughout

## develop

```bash
npm install
npm run dev     # http://localhost:3000 (or next free port)
npm run build   # static production build
```

## retrain

```bash
pip install torch torchvision
python train.py   # writes weights.json, copy it to public/model/weights.json
```
