# neural network visualizer

a real trained digit classifier running live in your browser, drawn as an
interactive 3d network. draw a number, hit run, watch the actual math happen,
then hover and click anything to check it.

live at [vedantsheel.com](https://vedantsheel.com), built by
[vedant sheel](https://vedantsheel.com).

## the network

`784 → 64 → 48 → 32 → 16 → 10`, 55,626 parameters, 96.9% accurate on digits
it never saw. trained with `train.py` (pytorch, about 2 minutes on a laptop
cpu), weights exported to `public/model/weights.json` (about 560 kb). the
forward pass is plain typescript in `lib/inference.ts`. no ml library, no
server.

## what you can do on the page

- draw and run: staged propagation animation driven by the real activations
- hover any neuron or connection to see its live value
- click a neuron to see its weights (the first layer shows them as a 28x28
  image), its weighted sum, its output, and a slider to force its activation
  and watch everything downstream recompute
- click a connection to see that one weight and what it's carrying right now
- speed slider and a one-layer-at-a-time step mode
- a guided tour, inline quizzes, hover definitions for every jargon term,
  links to the original papers (lecun 1998, rumelhart 1986, kingma and ba
  2014, and more), a glossary, and a reading list
- light and dark mode (persisted), reduced motion support throughout

## running it yourself

```bash
npm install
npm run dev     # http://localhost:3000 (or the next free port)
npm run build   # static production build
```

## retraining the model

```bash
pip install torch torchvision
python train.py   # writes weights.json, copy it to public/model/weights.json
```

## license

this project is open source under the [MIT license](LICENSE). take the code,
change the architecture, retrain it on something else, ship your own version.
if you build something with it i'd like to see it.
