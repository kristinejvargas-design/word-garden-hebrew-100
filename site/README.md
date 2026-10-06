# First 100 — Biblical Hebrew trainer

A dependency-free, mobile-first vocabulary trainer for the 100 most frequent Hebrew Bible lemmas, with pointed Hebrew, transliteration, Strong’s IDs, frequency counts, KJV examples, flashcards, a short quiz, and local spaced-review progress.

## Preview

From the workspace root:

```sh
python3 -m http.server 4173 --directory site
```

Then visit <http://127.0.0.1:4173>. A local HTTP server is needed because the browser fetches `data/words.json`; opening `index.html` directly with `file://` will block that request.

## Build the frequency data again

The generator is `../scripts/build_vocab.py` (relative to this folder). It expects source checkouts under the workspace's `tmp/research/` directory:

```sh
git clone --depth 1 https://github.com/openscriptures/morphhb.git tmp/research/morphhb
git clone --depth 1 https://github.com/openscriptures/HebrewLexicon.git tmp/research/HebrewLexicon
git clone --depth 1 https://github.com/aruljohn/Bible-kjv.git tmp/research/Bible-kjv
python3 scripts/build_vocab.py
```

The script scans OSHB verse words, takes the numbered Strong’s lemma at the end of each OSHB lemma path (so attached prefixes stay with the lexical head), sorts by frequency, and looks up the Hebrew form and gloss in the Open Scriptures Hebrew Lexicon. It then selects a corresponding KJV verse containing each source lemma. Proper names are included. Prefix-only grammatical tokens without a numbered lexical head are not ranked separately.

The verified run on October 6, 2026 counted 300,007 verse tokens with numbered Strong’s lemmas across the 39 WLC books, grouped into 8,640 distinct Strong’s IDs. The top 100 contribute 51.6% of those counted tokens. This is not a claim that the set covers 51.6% of English words or substitutes for grammar and reading practice.

## Integration into Seed Scroll

The self-contained static app lives in this folder. Once the product repository and framework are shared, move the HTML, CSS, JS, and vocabulary JSON into the app’s public asset structure or convert the trainer into a route/component. Keep the flashcard/review state isolated under its own feature key. Replace the current Seed Scroll homepage links with the product’s supported Strong’s/word-study deep link when that route is known; no unsupported URL scheme is assumed here.

## Credits and licenses

See [`sources.html`](sources.html) for the readable source notes and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) for notices.
