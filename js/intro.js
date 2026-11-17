
/*
 * Prāṇa intro — the original SVG wordmark writes on glyph-by-glyph.
 * It stays centred, fades away, and then the lotus mark appears.
 * Only the lotus mark travels directly into the top-left navigation slot.
 *
 * Built on the browser's native Web Animations API.
 *
 *   prepare()   waits for the logo image
 *   play(cb)    runs the intro; cb() fires as the homepage starts to appear
 */

const TIMING = {
  wordDraw: 2350,
  wordHold: 450,
  letterDraw: 420,
  letterStagger: 360,
  swirlIn: 1700,
  hold: 650,
  fly: 1600,
  revealAt: 350,
  bgFade: 950
};

const WORDMARK_HOLD = 500; // Keep PRĀNA centred for 0.5 seconds
const WORDMARK_FADE = 250; // Fade the wordmark away before the lotus appears

const SHAPE = {
  startRadius: 0,
  spiralTurns: 0,
  spinIn: 0,
  loopRadius: 0,
  spinOut: 0
};

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function prepare() {
  const mark = $('introMark');

  if (!mark.complete) {
    await new Promise((res, rej) => {
      mark.addEventListener('load', res, { once: true });
      mark.addEventListener('error', () => rej(new Error('logo mark failed to load')), { once: true });
    });
  }

  if (mark.decode) {
    try { await mark.decode(); } catch (e) { /* non-fatal */ }
  }

  if (!document.querySelector('.nav__mark') || !document.querySelector('.nav__word')) {
    throw new Error('nav logo slots missing');
  }

  if (!$('introWordmark')) throw new Error('intro wordmark missing');

  return { play };
}

function play(onReveal) {
  return new Promise((resolve) => {
    const root = $('intro');
    const bg = $('introBg');
    const halo = $('introHalo');
    const rings = [...root.querySelectorAll('.intro__ring')];
    const mark = $('introMark');
    const wordmark = $('introWordmark');
    const skipBtn = $('introSkip');
    const html = document.documentElement;

    const vw = innerWidth;
    const vh = innerHeight;
    const minSide = Math.min(vw, vh);

    const wordPhase = TIMING.wordDraw + TIMING.wordHold;
    const markStartDelay = wordPhase + WORDMARK_HOLD + WORDMARK_FADE;

    /* --- size the wordmark and measure its nav destination --- */
    wordmark.style.width = Math.min(vw * 0.68, 520) + 'px';
    wordmark.style.height = 'auto';
    wordmark.style.opacity = '1';

    const wordStart = wordmark.getBoundingClientRect();

    const wordSlot = document.querySelector('.nav__word').getBoundingClientRect();

    const wordDx = wordSlot.left + wordSlot.width / 2 -
      (wordStart.left + wordStart.width / 2);

    const wordDy = wordSlot.top + wordSlot.height / 2 -
      (wordStart.top + wordStart.height / 2);

    const wordScale = wordSlot.width / wordStart.width;

    /* --- size the lotus mark and measure its nav destination --- */
    const ratio = (mark.naturalWidth || 708) / (mark.naturalHeight || 444);

    const W0 = Math.min(vw * 0.62, 440);

    mark.style.width = W0 + 'px';
    mark.style.height = W0 / ratio + 'px';

    const slot = document.querySelector('.nav__mark').getBoundingClientRect();

    const dx1 = slot.left + slot.width / 2 - vw / 2;
    const dy1 = slot.top + slot.height / 2 - vh / 2;

    const s1 = slot.width / W0;

    /* --- lotus movement: appear in the centre, then travel straight --- */
    const { swirlIn, hold, fly } = TIMING;
    const total = swirlIn + hold + fly;

    const tx = (x, y, r, s) =>
      `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(4)})`;

    function stateAt(ms) {
      if (ms < swirlIn) {
        const t = ms / swirlIn;
        const e = outCubic(t);

        return {
          transform: tx(0, 0, 0, 0.1 + 0.9 * e),
          opacity: clamp01(t / 0.22),
          filter: 'blur(0px)'
        };
      }

      if (ms < swirlIn + hold) {
        const t = (ms - swirlIn) / hold;
        const s = 1 + 0.045 * Math.sin(Math.PI * t);

        return {
          transform: tx(0, 0, 0, s),
          opacity: 1,
          filter: 'blur(0px)'
        };
      }

      const t = (ms - swirlIn - hold) / fly;
      const e = inOutCubic(t);

      const x = dx1 * e;
      const y = dy1 * e;

      return {
        transform: tx(x, y, 0, 1 + (s1 - 1) * e),
        opacity: 1,
        filter: 'blur(0px)'
      };
    }

    const frames = [];
    const N = Math.round(total / 14);

    for (let i = 0; i <= N; i++) {
      frames.push(
        Object.assign(
          { offset: i / N, easing: 'linear' },
          stateAt((i / N) * total)
        )
      );
    }

    /* --- companion animations --- */
    const flyStart = swirlIn + hold;
    const anims = [];

    const run = (el, kf, opt) => {
      const a = el.animate(kf, Object.assign({ fill: 'both' }, opt));
      anims.push(a);
      return a;
    };

    /* Draw the actual vector glyphs in sequence */
    const letterWidths = [55, 38, 54, 58, 25, 55];

    const clipIds = [
      'introClipP',
      'introClipR',
      'introClipA1',
      'introClipN',
      'introClipDot',
      'introClipA2'
    ];

    clipIds.forEach((id, i) => {
      const rect = document.querySelector('#' + id + ' rect');
      if (!rect) return;

      const draw = rect.animate(
        [
          { width: '0px' },
          { width: letterWidths[i] + 'px' }
        ],
        {
          duration: TIMING.letterDraw,
          delay: i * TIMING.letterStagger,
          easing: 'cubic-bezier(.35,0,.2,1)',
          fill: 'forwards'
        }
      );

      anims.push(draw);
    });

    /* PRĀNA stays in the centre, then fades away */
    run(
      wordmark,
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration: WORDMARK_FADE,
        delay: wordPhase + WORDMARK_HOLD,
        easing: 'ease-out'
      }
    );

    /* Only the lotus mark moves to the navbar */
    const master = run(
      mark,
      frames,
      {
        duration: total,
        delay: markStartDelay,
        easing: 'linear'
      }
    );

    /* Halo animation */
    run(
      halo,
      [
        { opacity: 0, transform: 'scale(.55)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.72 },
        { opacity: 1, transform: 'scale(1.06)' }
      ],
      {
        duration: swirlIn + hold,
        delay: markStartDelay,
        easing: 'cubic-bezier(.2,.7,.2,1)'
      }
    );

    run(
      halo,
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration: 700,
        delay: markStartDelay + flyStart,
        fill: 'forwards'
      }
    );

    /* Ripple animations */
    rings.forEach((r, i) => {
      run(
        r,
        [
          { opacity: 0, transform: 'scale(.35)' },
          { opacity: 0.6, transform: 'scale(.9)', offset: 0.22 },
          { opacity: 0, transform: 'scale(2.7)' }
        ],
        {
          duration: 1500,
          delay: markStartDelay + swirlIn - 350 + i * 260,
          easing: 'cubic-bezier(.2,.7,.2,1)'
        }
      );
    });

    /* Background fade */
    run(
      bg,
      [
        { opacity: 1 },
        { opacity: 0 }
      ],
      {
        duration: TIMING.bgFade,
        delay: markStartDelay + flyStart + TIMING.revealAt - 100,
        easing: 'ease-in-out'
      }
    );

    /* --- lifecycle --- */
    let revealed = false;
    let done = false;

    const reveal = () => {
      if (revealed) return;
      revealed = true;

      try {
        onReveal && onReveal();
      } catch (e) {
        console.error(e);
      }
    };

    const revealTimer = setTimeout(
      reveal,
      markStartDelay + flyStart + TIMING.revealAt
    );

    function land() {
      if (done) return;

      done = true;
      clearTimeout(revealTimer);
      reveal();

      html.classList.add('logo-landed');
      root.style.display = 'none';

      anims.forEach((a) => {
        try { a.cancel(); } catch (e) {}
      });

      removeEventListener('keydown', onKey);
      resolve();
    }

    function skip() {
      if (done) return;

      clearTimeout(revealTimer);
      reveal();

      anims.forEach((a) => {
        try { a.pause(); } catch (e) {}
      });

      root.animate(
        [
          { opacity: 1 },
          { opacity: 0 }
        ],
        {
          duration: 380,
          easing: 'ease-out',
          fill: 'forwards'
        }
      ).finished.then(land, land);
    }

    const onKey = (e) => {
      if (e.key === 'Escape') skip();
    };

    skipBtn.addEventListener('click', skip);
    addEventListener('keydown', onKey);

    master.finished.then(land, () => {});

    /* --- debug --- */
    if (/[?&]debug\b/.test(location.search)) {
      anims.forEach((a) => a.pause());

      window.__pranaIntro = {
        total: markStartDelay + total + 1000,

        seek(ms) {
          anims.forEach((a) => {
            a.currentTime = ms;
          });
        },

        play() {
          anims.forEach((a) => a.play());
        }
      };
    }
  });
}
