export default function Explainer() {
  return (
    <section className="max-w-2xl mx-auto px-6 py-16 md:py-24 flex flex-col gap-8">
      <h2 className="font-display text-xl text-core tracking-wide">
        What you just watched
      </h2>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-core/75">
        <p>
          The network on this page is real. It was trained on 60,000 handwritten
          digits (the MNIST dataset) and reaches 94.1% accuracy on digits it has
          never seen. Its weights were exported to a JSON file, and when you hit
          Run, your browser multiplies your drawing through them — no server, no
          canned animation.
        </p>
        <p>
          Your drawing becomes 784 numbers: one brightness value per pixel of a
          28×28 image (that&apos;s the small &ldquo;model view&rdquo; thumbnail —
          exactly what the network sees). Each of the 16 nodes in the first
          hidden layer computes a weighted sum of all 784 pixels plus a bias,
          then keeps the result only if it&apos;s positive (the ReLU rule). Those
          16 numbers feed a second layer of 16 the same way, and those feed 10
          output nodes — one per digit. A final step (softmax) squashes the 10
          scores into probabilities that sum to 100%.
        </p>
        <p>
          Everything glowing in the scene is one of those numbers. A node&apos;s
          brightness is its activation. A fiber&apos;s thickness and brightness
          is the weight of that connection times the activation feeding into it
          — how much signal is actually flowing through that edge for{" "}
          <em>your</em> drawing. Cyan fibers carry positive (excitatory) signal;
          the dim slate ones carry negative (inhibitory) signal that pushes a
          node toward staying dark. The amber node at the end is the argmax:
          the digit the network bets on.
        </p>
        <p>
          This is also why weird predictions happen. The model only ever saw
          centered, pen-drawn digits, so an off-style stroke lights up a
          different set of fibers than it expects. Check the model-view
          thumbnail when a prediction surprises you — the network can only judge
          what survives the downsampling to 28×28.
        </p>
      </div>

      <p className="text-[11px] text-trace tracking-wider">
        784→16→16→10 · ~13,000 parameters · weights.json ≈ 130 KB · inference
        &lt; 1 ms
      </p>
    </section>
  );
}
