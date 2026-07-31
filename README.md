# Neural Network Visualizer

I made this for fun because I was bored one weekend lol. It kind of spiraled.

So this is a neural network that actually runs in your browser. You draw a
digit, 0 through 9, hit run, and you get to watch the real math happen step
by step, all the way from your pixels to a final answer. No server involved,
it's all just JavaScript doing matrix multiplication in real time.

I built this because I wanted to actually understand how these things work
under the hood instead of just calling `model.fit()` and trusting it. So I
trained a small classifier on MNIST (the classic handwritten digit dataset),
pulled the weights out into a plain JSON file, and wrote the forward pass
myself in TypeScript. Everything you see on the page, the glowing dots, the
lines lighting up, the percentages, all of it comes straight from that
computation happening on your machine. Nothing is faked or pre-rendered.

It's also fully open source, so feel free to poke around, fork it, or steal
whatever's useful to you.

Check it out live at [neuralnetworkvisualizer.org](https://www.neuralnetworkvisualizer.org/)

## What's actually going on

The network is 784 → 64 → 48 → 32 → 16 → 10. That first number is just every
pixel in a 28x28 image of your drawing. It funnels down through four hidden
layers and ends at 10 outputs, one per digit. About 55,600 numbers (weights
and biases) got tuned during training, and the whole thing lands around 97%
accuracy on digits it's never seen before.

I trained it with PyTorch (`train.py`), which takes maybe two minutes on a
regular laptop CPU, and it spits out `weights.json`. That file gets loaded by
the browser, and `lib/inference.ts` runs the actual forward pass in plain
TypeScript. No TensorFlow.js, no ONNX runtime, just arrays and loops.

## Things you can do on the page

- Draw something and watch it propagate through the network in real time
- Hover over any neuron or connection to see its actual value right now
- Click a neuron to see its full set of weights (the first layer even shows
  you the pixel pattern it's looking for), and drag a slider to override its
  output and watch how that changes everything downstream
- Click a connection to see exactly what that one weight is doing
- Slow the animation down, or step through it one layer at a time if you want
  to actually follow along instead of just watching it flash by
- There's a guided walkthrough if you want me to explain it, plus quizzes,
  hover definitions for the jargon, and links to the actual papers this stuff
  comes from (copies of the papers live in `papers/` too)
- Light and dark mode, and it remembers which one you picked

## Running it locally

```bash
npm install
npm run dev
```

Then open localhost:3000, or whatever port it prints if 3000's already taken.

## Retraining the model

If you want to mess with the architecture or retrain it yourself:

```bash
pip install torch torchvision
python train.py
```

That writes a fresh `weights.json`. Copy it into `public/model/weights.json`
and reload the page.

## License

This project is open source under the [MIT license](LICENSE). Do whatever
you want with it: fork it, retrain it on something completely different, rip
out the visualization for your own project. If you build something with it
I'd genuinely like to see it.
