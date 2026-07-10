"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import ChapterRail, { MobileChapterNav } from "@/components/ChapterRail";
import MathTex from "@/components/MathTex";
import Quiz from "@/components/Quiz";
import Term from "@/components/Term";
import { matLatex, vecLatex } from "@/lib/latex";
import { useApp } from "@/lib/store";
import { ARCH } from "@/lib/theme";

/*
 * the whole explainer. written like i'd explain it to a friend, with the
 * jargon underlined so you can hover it, quick quizzes to check it landed,
 * and links to the actual papers where the ideas came from. every number
 * in the math blocks is pulled live from your latest run.
 */

/** a circuit-trace rule that draws itself in as it enters view, and keeps
 *  drawing/retracting with actual scroll position rather than a flat fade */
function Trace() {
  const reduced = useApp((s) => s.reducedMotion);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 45%"] });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div ref={ref} className="max-w-2xl mx-auto px-6">
      <motion.div
        style={reduced ? { scaleX: 1 } : { scaleX, transformOrigin: "left" }}
        className="h-px bg-graphite relative"
      >
        <span className="absolute right-0 -top-[3px] w-[7px] h-[7px] bg-copper" />
      </motion.div>
    </div>
  );
}

function Section({ id, num, title, children }: { id: string; num: number; title: string; children: React.ReactNode }) {
  const reduced = useApp((s) => s.reducedMotion);
  const ref = useRef<HTMLElement>(null);
  const fromLeft = num % 2 === 1;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const numY = useTransform(scrollYProgress, [0, 1], [50, -30]);
  const numOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.4, 0.12]);

  return (
    <section ref={ref} id={id} className="relative max-w-2xl mx-auto px-6 py-16 md:py-24 overflow-hidden">
      <motion.span
        aria-hidden="true"
        style={reduced ? { opacity: 0.15 } : { y: numY, opacity: numOpacity }}
        className="pointer-events-none select-none absolute -top-2 md:top-0 right-2 md:-right-4 text-[64px] md:text-[150px] font-bold text-graphite leading-none"
      >
        {String(num).padStart(2, "0")}
      </motion.span>
      <motion.div
        initial={
          reduced
            ? false
            : {
                opacity: 0,
                clipPath: fromLeft ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)",
              }
        }
        whileInView={{ opacity: 1, clipPath: "inset(0 0% 0 0%)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: reduced ? 0 : 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-ink mb-6 lowercase">{title}</h2>
        {children}
      </motion.div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[17px] leading-relaxed text-ink/90 mb-5">{children}</p>;
}

function Paper({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="plain" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

// ---- live math block for one transition ----

function LiveMath({ t }: { t: number }) {
  const model = useApp((s) => s.model);
  const run = useApp((s) => s.run);
  const input = useApp((s) => s.input);
  if (!model || !run) {
    return (
      <p className="text-[13px] text-faint my-3">
        (draw something and hit run. this fills in with your actual numbers)
      </p>
    );
  }
  const W = model.layers[t].weights;
  const b = model.layers[t].biases;
  const x = t === 0 ? input : run.result.layers[t - 1].a;
  const { z, a } = run.result.layers[t];
  const isOutput = t === model.layers.length - 1;
  if (!x) return null;
  const tex =
    `\\underbrace{${matLatex(W, 3, 4)}}_{\\text{weights, } ${W.length}\\times${W[0].length}}` +
    `\\underbrace{${vecLatex(x, 4)}}_{\\text{what comes in}}` +
    ` + \\underbrace{${vecLatex(b, 3)}}_{\\text{biases}}` +
    ` = \\underbrace{${vecLatex(z, 3)}}_{\\text{sums}}` +
    (isOutput
      ? `\\;\\xrightarrow{\\;\\text{softmax}\\;} \\underbrace{${vecLatex(a, 3)}}_{\\text{probabilities}}`
      : `\\;\\xrightarrow{\\;\\max(0,\\,z)\\;} \\underbrace{${vecLatex(a, 3)}}_{\\text{what goes out}}`);
  return (
    <div className="my-4">
      <p className="text-[12px] text-faint mb-1">
        with your drawing, right now. showing 3 of {W.length} rows, click a
        neuron in the network for its full picture:
      </p>
      <MathTex block className="text-ink" tex={tex} />
    </div>
  );
}

// ---- sections ----

function Machine() {
  return (
    <Section id="machine" num={1} title="what you're looking at">
      <P>
        the thing spinning above is a{" "}
        <Term d="a pile of simple math units ('neurons') wired together with adjustable numbers ('weights'). that's the whole thing. no magic.">
          neural network
        </Term>{" "}
        i trained to read handwritten digits. it has six stops: your drawing
        (784 numbers), then layers of 64, 48, 32, and 16{" "}
        <Term d="a neuron just adds up its inputs (each multiplied by a weight), adds a bias, and passes the result on. it's about five lines of code.">
          neurons
        </Term>
        , then 10 outputs, one per digit. in total it has 55,626{" "}
        <Term d="the weights and biases. these are the numbers that training adjusts. everything else about the network is fixed.">
          parameters
        </Term>
        , and it gets 96.9% of handwritten digits right on{" "}
        <Term d="10,000 digits the network never saw during training. testing on stuff it trained on would be cheating.">
          images it has never seen
        </Term>
        .
      </P>
      <P>
        nothing on this page is a recording. the weights sit in a 560 kb json
        file your browser downloaded, and when you hit run, your device does
        all 55,626 multiplications itself, in under a millisecond. the lights
        in the 3d view are those numbers. hover anything to see its value,
        click anything to open it up.
      </P>
      <P>
        one honest note about the picture: drawing all 6,304 connections at
        once is an unreadable hairball, so the view only draws each
        neuron&apos;s strongest connections. the math underneath always uses
        every single one, and clicking any neuron shows you all of its
        weights, including the ones not drawn.
      </P>
      <P>
        the dataset it learned from is called{" "}
        <Term d="70,000 handwritten digits collected from us census workers and high school students in the 90s. the 'hello world' of machine learning.">
          mnist
        </Term>
        , introduced in{" "}
        <Paper href="http://yann.lecun.com/exdb/publis/pdf/lecun-98.pdf">
          lecun, bottou, bengio &amp; haffner (1998)
        </Paper>
        , which is also the paper that made convolutional networks famous.
      </P>
    </Section>
  );
}

function Pixels() {
  const input = useApp((s) => s.input);
  const on = input ? Array.from(input).filter((v) => v > 0.05).length : null;
  return (
    <Section id="pixels" num={2} title="step 1: your drawing becomes 784 numbers">
      <P>
        computers don&apos;t see drawings. they see numbers. so the first step
        is brutal: your drawing gets squashed down to a 28×28 grid, and each
        of those 784 little squares becomes a number between 0 (no ink) and 1
        (full ink). that tiny &ldquo;what it sees&rdquo; thumbnail next to the
        drawing pad is exactly this, and it&apos;s all the network ever gets.
        {on !== null && (
          <>
            {" "}
            right now, {on} of your 784 pixels have ink on them.
          </>
        )}
      </P>
      <P>
        before that, i do one sneaky thing the original dataset did too: your
        digit gets cropped, shrunk to fit a 20×20 box, and centered by its{" "}
        <Term d="the average position of all the ink, weighted by how dark it is. putting it at the middle means the network doesn't have to learn 'a 7 in the corner' separately from 'a 7 in the middle'.">
          center of mass
        </Term>
        . without this, accuracy on real drawings falls off a cliff, because
        the network only ever practiced on centered digits.
      </P>
      <Quiz
        q="you draw a tiny 3 in the corner of the pad. what does the network actually receive?"
        options={[
          "a tiny 3 in the corner of a 28×28 grid",
          "the same 3, but scaled up and moved to the center",
          "the exact pixels of the pad at full resolution",
        ]}
        answer={1}
        explain="the preprocessing crops your ink, scales it to a standard size, and centers it, because that's the format of every digit it trained on. the network never learns 'where' a digit is, only 'what' it is."
      />
    </Section>
  );
}

function LayerOne() {
  return (
    <Section id="layer-1" num={3} title="step 2: 64 neurons look for strokes">
      <P>
        each of the 64 neurons in the first layer owns 784{" "}
        <Term d="an adjustable number attached to one connection. positive means 'this input is evidence for me', negative means 'this input is evidence against me', near zero means 'don't care'.">
          weights
        </Term>
        , one per pixel. a neuron multiplies every pixel by its weight for
        that pixel, adds them all up, and adds one extra number called a{" "}
        <Term d="a per-neuron offset that shifts how easy it is to fire. a very negative bias means 'i need a lot of evidence before i say anything'.">
          bias
        </Term>
        . that&apos;s it. because the weights line up with pixels, you can
        literally draw them: click any neuron in the first layer above and
        you&apos;ll see its weights as a 28×28 image. most of them look like
        little edge and stroke fragments, because that&apos;s what turned out
        to be useful.
      </P>
      <P>
        the sum then goes through{" "}
        <Term d="rectified linear unit. sounds fancy, is one line: if the number is negative, make it 0. if it's positive, leave it alone.">
          relu
        </Term>
        : negative results become zero, positive ones pass through. so a
        neuron either stays silent or fires by some amount. this one-liner is
        a big part of why deep networks became trainable at all, see{" "}
        <Paper href="https://www.cs.toronto.edu/~hinton/absps/reluICML.pdf">
          nair &amp; hinton (2010)
        </Paper>{" "}
        and{" "}
        <Paper href="https://proceedings.mlr.press/v15/glorot11a/glorot11a.pdf">
          glorot, bordes &amp; bengio (2011)
        </Paper>
        .
      </P>
      <LiveMath t={0} />
      <Quiz
        q="a weight from a pixel to a neuron is -2.3. you put ink on that pixel. what happens to the neuron?"
        options={[
          "it's pushed toward firing",
          "it's pushed toward staying silent",
          "nothing, negative weights are ignored",
        ]}
        answer={1}
        explain="ink (a positive number) times a negative weight is a negative contribution to the sum. that pixel is evidence against this neuron. negative weights are half the intelligence here, they're how the network rules things out."
      />
    </Section>
  );
}

function MiddleLayers() {
  const run = useApp((s) => s.run);
  const silent = (l: number) => {
    if (!run) return null;
    const a = run.result.layers[l].a;
    let c = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === 0) c++;
    return c;
  };
  return (
    <Section id="middle" num={4} title="steps 3, 4, 5: strokes become parts, parts become shapes">
      <P>
        the layers of 48, 32, and 16 neurons never see your pixels. each one
        only sees the outputs of the layer before it, and does the exact same
        move: weighted sum, plus bias, relu. so layer two learns things like
        &ldquo;fire when stroke-detectors 3 and 17 fire together but 24
        doesn&apos;t&rdquo;, which starts to mean loops, crossbars, tails.
        layer three combines those, layer four combines those. complexity
        stacks up while every individual step stays dumb.
      </P>
      <P>
        i&apos;ll be honest about the limits of that story: nobody assigns
        these roles, and real neurons end up messier than &ldquo;loop
        detector&rdquo;. they&apos;re whatever mixture of evidence happened to
        reduce mistakes during training. if you want to see how researchers
        actually try to figure out what neurons do, the interactive articles
        at{" "}
        <Paper href="https://distill.pub/2017/feature-visualization/">
          distill (olah et al., 2017)
        </Paper>{" "}
        are the best thing on the internet for it.
      </P>
      {run && (
        <P>
          a fun live detail: in your last run, {silent(1)} of the 48 neurons
          in layer two, {silent(2)} of the 32 in layer three, and {silent(3)}{" "}
          of the 16 in layer four output exactly zero. relu shut them off.
          most of the network is silent most of the time, and that&apos;s
          normal.
        </P>
      )}
      <LiveMath t={2} />
      <P>
        why stack layers at all? in theory even one enormous hidden layer can
        approximate nearly any function, that&apos;s a real theorem, see{" "}
        <Paper href="https://link.springer.com/article/10.1007/BF02551274">
          cybenko (1989)
        </Paper>{" "}
        and{" "}
        <Paper href="https://www.sciencedirect.com/science/article/abs/pii/0893608089900208">
          hornik, stinchcombe &amp; white (1989)
        </Paper>
        . in practice, depth lets later layers reuse what earlier layers
        figured out, which needs far fewer neurons than doing everything in
        one giant step.
      </P>
      <Quiz
        q="what does a neuron in layer three actually receive as input?"
        options={[
          "your 784 pixels",
          "the 32 outputs of layer three's own neurons",
          "the 48 outputs of layer two",
        ]}
        answer={2}
        explain="each layer only sees the previous layer's outputs. by layer three your drawing is long gone, it's working with layer two's summary of layer one's summary of the pixels."
      />
    </Section>
  );
}

function Output() {
  return (
    <Section id="output" num={5} title="step 6: ten scores, one answer">
      <P>
        the last layer is a vote. each of the 10 output neurons (one per
        digit) takes a weighted sum of the 16 signals from layer four.
        positive weights are evidence for that digit, negative weights are
        evidence against. the raw results are called{" "}
        <Term d="the 10 raw scores before they get turned into percentages. they can be any size, positive or negative. bigger = more evidence.">
          logits
        </Term>
        , and they can be any size, which isn&apos;t very readable. that&apos;s
        what the next section fixes.
      </P>
      <LiveMath t={4} />
    </Section>
  );
}

function Softmax() {
  const run = useApp((s) => s.run);
  const logits = run ? Array.from(run.result.layers[ARCH.length - 2].z) : null;
  const maxZ = logits ? Math.max(...logits) : 0;
  const exps = logits?.map((z) => Math.exp(z - maxZ));
  const expSum = exps?.reduce((s, v) => s + v, 0) ?? 1;
  return (
    <Section id="softmax" num={6} title="softmax: why the answer comes as percentages">
      <P>
        <Term d="a function that turns any list of numbers into percentages that add to 100%, keeping their order. bigger inputs get disproportionately bigger shares.">
          softmax
        </Term>{" "}
        raises e to the power of each logit, then divides each result by the
        total. every output lands between 0 and 1 and they always sum to
        exactly 1:
      </P>
      <MathTex block className="text-ink" tex={`p_k = \\frac{e^{z_k}}{\\sum_{j=0}^{9} e^{z_j}}`} />
      <P>
        the exponential is why the network so often says 99%: a logit lead of
        just 4 becomes an e⁴ ≈ 55× probability ratio. so &ldquo;99%
        sure&rdquo; doesn&apos;t mean it&apos;s right, it means the winner had
        a few units more evidence than the runner-up. draw something halfway
        between a 4 and a 9 and watch the percentages flatten out.
      </P>
      {logits && exps && (
        <div className="overflow-x-auto my-4">
          <table className="font-mono text-[11px] text-ink w-full min-w-[400px]">
            <thead>
              <tr className="text-faint text-left">
                <th className="py-1 pr-3 font-normal">digit</th>
                <th className="py-1 pr-3 font-normal">logit</th>
                <th className="py-1 pr-3 font-normal">e^logit</th>
                <th className="py-1 font-normal">share of total</th>
              </tr>
            </thead>
            <tbody>
              {logits.map((z, k) => {
                const win = k === run!.result.prediction;
                return (
                  <tr key={k} className={win ? "text-gold font-bold" : ""}>
                    <td className="py-0.5 pr-3">{k}</td>
                    <td className="py-0.5 pr-3 tabular-nums">{z.toFixed(3)}</td>
                    <td className="py-0.5 pr-3 tabular-nums">{exps[k].toFixed(4)}</td>
                    <td className="py-0.5 tabular-nums">{((exps[k] / expSum) * 100).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-faint">
            your actual numbers from the last run. (the e^ column is shifted by
            the max logit so the computer doesn&apos;t overflow. the
            percentages come out identical.)
          </p>
        </div>
      )}
      <Quiz
        q="the network says 98% for '7'. what does that actually tell you?"
        options={[
          "there's a 98% chance it's objectively a 7",
          "the evidence for 7 hugely outweighed the other nine options, for this network",
          "the network is 98% accurate",
        ]}
        answer={1}
        explain="softmax only compares the ten options against each other. if your drawing is unlike anything it trained on, it can be extremely confident and completely wrong. confidence is about the gap in evidence, not about truth."
      />
    </Section>
  );
}

function Wrong() {
  return (
    <Section id="wrong" num={7} title="when it screws up (try it, it's fun)">
      <P>
        draw a 1 with a big serif and a base. draw a 7 with a european
        crossbar. draw something tiny in the corner, or a 6 that&apos;s mostly
        loop. some of these will fool it, and every failure has the same
        boring, honest cause: the network only knows the world it saw during
        training, and your drawing left that world.
      </P>
      <P>
        when a prediction surprises you, look at the &ldquo;what it
        sees&rdquo; thumbnail first. after squashing to 28×28, your careful
        drawing might genuinely be ambiguous. then click the output neurons
        and look at which layer-four signals voted for the wrong digit. the
        wrong answer is never mysterious, it&apos;s just arithmetic you can
        follow, which is exactly what this page is for.
      </P>
      <P>
        also worth knowing: this is a deliberately simple network. modern
        digit readers use{" "}
        <Term d="networks whose early layers slide small filters across the image, so learning 'a loop' works anywhere in the image, not just where it appeared in training. that idea is from the same lecun 1998 paper.">
          convolutional layers
        </Term>{" "}
        and get above 99.5% on this dataset. i kept mine fully-connected
        because you can see every single weight, which you can&apos;t really
        do once convolutions get involved.
      </P>
    </Section>
  );
}

function Training() {
  const reduced = useApp((s) => s.reducedMotion);
  return (
    <Section id="training" num={8} title="how it learned (before you got here)">
      <P>
        nothing on this page learns. the weights were frozen before you
        arrived. training happened once, on my machine, like this: show the
        network a digit with a known label. run the exact forward pass
        you&apos;ve been watching. measure how wrong the percentages were
        with a{" "}
        <Term d="a single number scoring how bad the prediction was. here it's cross-entropy: it punishes being confidently wrong much harder than being unsure.">
          loss function
        </Term>
        . then, and this is the clever part, work backwards through the
        layers computing, for each of the 55,626 weights, whether nudging it
        up or down would have made the loss smaller. that backwards sweep is{" "}
        <Term d="an efficient way to compute every weight's effect on the loss in one backwards pass. mechanically it's the chain rule from calculus, applied very systematically.">
          backpropagation
        </Term>
        , the algorithm from{" "}
        <Paper href="https://www.nature.com/articles/323533a0">
          rumelhart, hinton &amp; williams (1986)
        </Paper>
        .
      </P>
      <P>
        then nudge every weight a tiny step in its helpful direction and
        repeat. i used an update rule called adam (
        <Paper href="https://arxiv.org/abs/1412.6980">kingma &amp; ba, 2014</Paper>
        ) which adapts the step size per weight, and went through all 60,000
        training digits eight times (each full pass is called an{" "}
        <Term d="one complete pass through the training set. this network trained for 8 of them, about two minutes on a laptop cpu.">
          epoch
        </Term>
        ). that&apos;s roughly 480,000 rounds of guess, score, nudge. stroke
        detectors and digit votes fall out of nothing but repetition.
      </P>

      <svg
        width="220"
        height="230"
        viewBox="0 0 220 230"
        className="mx-auto my-6"
        aria-label="the training loop: forward pass, measure the miss, backpropagate, nudge weights, repeat"
      >
        {[
          { y: 20, label: "run a digit through" },
          { y: 80, label: "score the miss (loss)" },
          { y: 140, label: "backprop: who's to blame?" },
          { y: 200, label: "nudge all 55,626 weights" },
        ].map((s) => (
          <g key={s.label}>
            <rect x="18" y={s.y - 14} width="164" height="28" rx="4" className="fill-[var(--card)] stroke-[var(--graphite)]" />
            <text x="100" y={s.y + 4} textAnchor="middle" className="fill-[var(--ink)] font-mono" fontSize="9.5">
              {s.label}
            </text>
          </g>
        ))}
        {[34, 94, 154].map((y) => (
          <path key={y} d={`M100 ${y} v18`} className="stroke-[var(--copper)]" strokeWidth="1.5" markerEnd="url(#arr)" fill="none" />
        ))}
        <motion.path
          d="M182 200 h24 v-180 h-24"
          className="stroke-[var(--copper)]"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#arr)"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 1.1, delay: reduced ? 0 : 0.2 }}
        />
        <text x="214" y="112" textAnchor="middle" className="fill-[var(--faint)] font-mono" fontSize="9" transform="rotate(90 210 112)">
          ×480,000
        </text>
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" className="fill-[var(--copper)]" />
          </marker>
        </defs>
      </svg>

      <Quiz
        q="what actually changes while a network trains?"
        options={[
          "the number of neurons grows",
          "the weights and biases get adjusted",
          "it memorizes every training image",
        ]}
        answer={1}
        explain="the architecture stays fixed. training only turns the 55,626 knobs. (and it can't just memorize, 55k numbers is nowhere near enough storage for 60,000 images, which is partly why it's forced to learn patterns that generalize.)"
      />
    </Section>
  );
}

function Bigger() {
  return (
    <Section id="bigger" num={9} title="is chatgpt just a bigger version of this?">
      <P>
        genuinely, more than you&apos;d think. the core loop, weighted sums,
        nonlinearities, softmax at the end, loss, backprop, gradient steps,
        is the same. the big models add a different wiring diagram called a{" "}
        <Term d="an architecture where every token can look at every other token and decide what's relevant ('attention'), instead of signals only flowing forward layer by layer.">
          transformer
        </Term>{" "}
        (
        <Paper href="https://arxiv.org/abs/1706.03762">
          vaswani et al., 2017, &ldquo;attention is all you need&rdquo;
        </Paper>
        ), predict the next word instead of a digit, and scale the parameter
        count from my 55 thousand to hundreds of billions. the mystery of
        modern ai isn&apos;t in the mechanism you just watched. it&apos;s in
        what falls out when you make this mechanism absurdly large.
      </P>
    </Section>
  );
}

function Glossary() {
  const terms: [string, string][] = [
    ["neuron", "adds up its inputs (each times a weight), adds a bias, applies relu. five lines of code."],
    ["weight", "an adjustable number on one connection. positive = evidence for, negative = evidence against."],
    ["bias", "a per-neuron offset that sets how easy it is to fire."],
    ["activation", "a neuron's output after relu. zero means silent."],
    ["relu", "if negative, output 0. otherwise pass through. that's the whole function."],
    ["logit", "a raw output score before softmax. any size, either sign."],
    ["softmax", "turns the 10 logits into percentages that sum to 100."],
    ["parameter", "any trained number. this network has 55,626 (weights + biases)."],
    ["loss", "one number scoring how wrong a prediction was. training tries to shrink it."],
    ["gradient", "for each weight, which direction (and how strongly) it would change the loss."],
    ["backpropagation", "the backwards sweep that computes all the gradients in one pass."],
    ["epoch", "one full pass through the 60,000 training images."],
    ["mnist", "the classic dataset of 70,000 handwritten digits this network learned from."],
  ];
  return (
    <Section id="glossary" num={10} title="every term on this page, in one place">
      <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
        {terms.map(([t, d]) => (
          <div key={t} className="contents">
            <dt className="font-mono text-copper">{t}</dt>
            <dd className="text-ink/85 leading-relaxed">{d}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function ReadMore() {
  const links: [string, string, string][] = [
    [
      "3blue1brown's neural network series",
      "https://www.3blue1brown.com/topics/neural-networks",
      "the best visual intuition for exactly the network on this page. start here.",
    ],
    [
      "michael nielsen, neural networks and deep learning",
      "http://neuralnetworksanddeeplearning.com/",
      "a free book that builds this same digit classifier from scratch, with all the math.",
    ],
    [
      "lecun et al. (1998), gradient-based learning applied to document recognition",
      "http://yann.lecun.com/exdb/publis/pdf/lecun-98.pdf",
      "the mnist paper. also where convolutional networks took off.",
    ],
    [
      "rumelhart, hinton & williams (1986), learning representations by back-propagating errors",
      "https://www.nature.com/articles/323533a0",
      "the three-page nature paper that made training deep networks practical.",
    ],
    [
      "kingma & ba (2014), adam",
      "https://arxiv.org/abs/1412.6980",
      "the optimizer i used. one of the most cited papers in all of computer science.",
    ],
    [
      "olah et al., distill: feature visualization",
      "https://distill.pub/2017/feature-visualization/",
      "what neurons in big vision networks actually respond to. gorgeous and rigorous.",
    ],
    [
      "goodfellow, bengio & courville, deep learning",
      "https://www.deeplearningbook.org/",
      "the standard textbook, free online, when you want the full treatment.",
    ],
    [
      "vaswani et al. (2017), attention is all you need",
      "https://arxiv.org/abs/1706.03762",
      "the transformer paper, if the chatgpt section made you curious.",
    ],
  ];
  return (
    <Section id="reading" num={11} title="if you want to go deeper">
      <ul className="flex flex-col gap-3">
        {links.map(([title, href, note]) => (
          <li key={href} className="text-[14px] leading-relaxed">
            <Paper href={href}>{title}</Paper>
            <span className="text-faint">. {note}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function About() {
  return (
    <Section id="about" num={12} title="about this">
      <P>
        i&apos;m vedant. i built everything here: trained the network in
        pytorch (the script is in the repo, it takes about two minutes on a
        laptop), wrote the forward pass in plain typescript so it runs in
        your browser with no server, and built the 3d view on top of it. the
        one rule i held myself to: never fake a number. if something glows,
        it&apos;s because the math said so, and you can click it to check me.
      </P>
      <p className="text-[15px] text-faint">
        the rest of my stuff lives at{" "}
        <a className="plain" href="https://vedantsheel.com" target="_blank" rel="noopener noreferrer">
          vedantsheel.com
        </a>
        , and if you want to talk about this:{" "}
        <span className="font-mono text-[13px]">vedant.sheel [at] uwaterloo [dot] com</span>
      </p>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-graphite">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[16px] text-ink">
          built by{" "}
          <a className="plain font-medium" href="https://vedantsheel.com" target="_blank" rel="noopener noreferrer">
            vedant sheel
          </a>
        </p>
        <p className="font-mono text-[12px] text-faint">
          pytorch → json → typescript → your gpu. no server.
        </p>
      </div>
    </footer>
  );
}

export default function Chapters() {
  return (
    <div className="pb-14 lg:pb-0">
      <ChapterRail />
      <MobileChapterNav />
      <Machine />
      <Trace />
      <Pixels />
      <Trace />
      <LayerOne />
      <Trace />
      <MiddleLayers />
      <Trace />
      <Output />
      <Trace />
      <Softmax />
      <Trace />
      <Wrong />
      <Trace />
      <Training />
      <Trace />
      <Bigger />
      <Trace />
      <Glossary />
      <Trace />
      <ReadMore />
      <Trace />
      <About />
      <Footer />
    </div>
  );
}
