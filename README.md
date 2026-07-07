# neural network visualizer

i made this for fun because i was bored one weekend lol. it kind of spiraled.

so this is a neural network that actually runs in your browser. you draw a
digit, 0 through 9, hit run, and you get to watch the real math happen step
by step, all the way from your pixels to a final answer. no server involved,
it's all just javascript doing matrix multiplication in real time.

i built this because i wanted to actually understand how these things work
under the hood instead of just calling `model.fit()` and trusting it. so i
trained a small classifier on mnist (the classic handwritten digit dataset),
pulled the weights out into a plain json file, and wrote the forward pass
myself in typescript. everything you see on the page, the glowing dots, the
lines lighting up, the percentages, all of it comes straight from that
computation happening on your machine. nothing is faked or pre-rendered.

check it out live at [neuralnetworkvisualizer.org](https://www.neuralnetworkvisualizer.org/)

## what's actually going on

the network is 784 → 64 → 48 → 32 → 16 → 10. that first number is just every
pixel in a 28x28 image of your drawing. it funnels down through four hidden
layers and ends at 10 outputs, one per digit. about 55,600 numbers (weights
and biases) got tuned during training, and the whole thing lands around 97%
accuracy on digits it's never seen before.

i trained it with pytorch (`train.py`), which takes maybe two minutes on a
regular laptop cpu, and it spits out `weights.json`. that file gets loaded by
the browser, and `lib/inference.ts` runs the actual forward pass in plain
typescript. no tensorflow.js, no onnx runtime, just arrays and loops.

## things you can do on the page

- draw something and watch it propagate through the network in real time
- hover over any neuron or connection to see its actual value right now
- click a neuron to see its full set of weights (the first layer even shows
  you the pixel pattern it's looking for), and drag a slider to override its
  output and watch how that changes everything downstream
- click a connection to see exactly what that one weight is doing
- slow the animation down, or step through it one layer at a time if you want
  to actually follow along instead of just watching it flash by
- there's a guided walkthrough if you want me to explain it, plus quizzes,
  hover definitions for the jargon, and links to the actual papers this stuff
  comes from
- light and dark mode, and it remembers which one you picked

## running it locally

```bash
npm install
npm run dev
```

then open localhost:3000, or whatever port it prints if 3000's already taken.

## retraining the model

if you want to mess with the architecture or retrain it yourself:

```bash
pip install torch torchvision
python train.py
```

that writes a fresh `weights.json`. copy it into `public/model/weights.json`
and reload the page.

## license

mit licensed, do whatever you want with it. fork it, retrain it on something
completely different, rip out the visualization for your own project. if you
build something with it i'd genuinely like to see it.
