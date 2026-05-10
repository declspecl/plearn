# Vietnamese Learning Tool: Product Gaps from the User's Point of View

## Purpose

This document describes the product by working backward from the learner's point of view.

It does not start with features already built.
It starts with the user's unmet needs:

1. What the product does **not** currently satisfy.
2. What the user **wants** the product to do.
3. How the product should **ideally work** when those needs are met.

The goal is to keep product decisions anchored to the actual experience of learning Vietnamese, not just to the current implementation.

---

## The User's Job

If I am learning Vietnamese, my real job is not:

- to build a catalog
- to inspect a graph
- to save decompositions
- to admire analytics

My real job is:

- to understand real Vietnamese I encounter
- to remember what I learn
- to hear it correctly
- to say it naturally
- to choose the right pronouns, particles, and register
- to reuse patterns in my own speech and writing
- to feel steady progress over time

If the product does not help me do those things, it is missing the point.

---

## What the Product Does Not Yet Satisfy

### 1. "I can understand it now, but I probably won't remember it later."

The current product is strong at explanation and decomposition, but weak at retention.

From the user's point of view:

- I can paste a sentence and get a smart breakdown.
- I can save items into a catalog.
- I can inspect related items later.
- But I am not being helped to remember any of it.

What is missing:

- a daily review loop
- spaced repetition
- active recall
- a queue of what is due now
- forgetting-aware repetition
- feedback on what I keep missing

The user problem is not "I need more saved entries."
The user problem is "I do not trust myself to retain what I just learned."

### 2. "I still cannot hear or pronounce Vietnamese well."

Vietnamese is not only textual.
It is tonal, rhythmic, social, and auditory.

From the user's point of view:

- I may understand the explanation intellectually.
- I may see tone visuals.
- But I still do not know how it sounds in real speech.
- I still do not know whether I can pronounce it well enough to be understood.

What is missing:

- audio playback for words, phrases, and whole sentences
- text-to-speech tuned for useful learner playback
- slow playback and repeat loops
- shadowing mode
- pronunciation recording
- pronunciation feedback
- listening discrimination for tones and near-minimal pairs

The user problem is not "I need more text analysis."
The user problem is "I cannot convert this into listening and speaking ability."

### 3. "The product explains Vietnamese, but it does not make me produce Vietnamese."

Understanding input is only half the work.
The learner must also produce output.

From the user's point of view:

- I can read explanations.
- I can browse catalog entries.
- I can chat.
- But I am not being pushed through deliberate output practice.

What is missing:

- prompted sentence production
- pattern drills
- pronoun-choice drills
- particle-choice drills
- rewrite exercises across tone and register
- correction loops
- constrained practice using recently learned items

The user problem is not "I want a chat box."
The user problem is "I want structured practice that forces me to use what I learned."

### 4. "I do not know what to study next."

A motivated self-directed learner can do a lot with the current product.
A beginner or intermediate learner still needs guidance.

From the user's point of view:

- I may have a pile of saved items.
- I may have many analyzed sentences.
- But I do not know what matters most.
- I do not know what is foundational.
- I do not know what sequence will produce fast gains.

What is missing:

- a clear learning path
- staged progression
- priority by usefulness and frequency
- beginner-safe defaults
- thematic clusters
- explicit grammar families
- skill-based milestones

The user problem is not "I need more tools."
The user problem is "I need direction."

### 5. "I learn from real-world material, but the product does not help me capture it well."

Real learning material comes from everywhere:

- messages
- YouTube
- podcasts
- shows
- social media
- articles
- conversations

From the user's point of view:

- I should be able to capture what I encountered in context.
- I should not have to manually retype everything.
- I should not lose source context once a sentence becomes a workspace item.

What is missing:

- source capture flows
- import from transcripts or subtitles
- source URLs and metadata
- saved context around the sentence
- batching from a single source
- clipping workflows
- a queue for "study this later"

The user problem is not "I need another text box."
The user problem is "I want to learn from my actual life and media diet."

### 6. "I need help with social correctness, not just literal correctness."

Vietnamese is deeply contextual.
Choosing the wrong pronoun or register can make a sentence awkward, cold, childish, rude, or simply wrong for the situation.

From the user's point of view:

- I need more than dictionary meaning.
- I need help knowing who can say what to whom.
- I need to understand Southern usage in lived situations.

What is missing:

- explicit scenario modeling
- relationship-based pronoun practice
- register comparison
- "say this to a friend / older person / partner / stranger / coworker" variations
- warnings when a phrase is technically valid but socially off
- drills that train the same idea across contexts

The user problem is not "translate this sentence."
The user problem is "help me avoid sounding unnatural or socially wrong."

### 7. "I cannot easily tell whether I am truly progressing."

Counts and graphs are interesting, but they are not the same as learning progress.

From the user's point of view:

- A growing catalog feels productive.
- A graph looks sophisticated.
- But neither tells me whether I can now understand more, remember more, or speak better.

What is missing:

- retention metrics
- recall success rates
- listening comprehension progress
- production accuracy trends
- coverage of high-frequency patterns
- repeated failure signals
- "you can now do X" progress framing

The user problem is not "I want more analytics."
The user problem is "I want proof that my Vietnamese is improving."

### 8. "I still have to trust the system too much."

AI-generated explanation is useful, but language learners need calibration.

From the user's point of view:

- I want alternative phrasings when they matter.
- I want to know when something is uncertain.
- I want register notes I can trust.
- I want examples grounded in real usage.

What is missing:

- confidence signaling
- alternative wording comparison
- more explicit uncertainty handling
- clearer distinction between common, possible, and unnatural
- stronger grounding in observed usage

The user problem is not "give me one answer quickly."
The user problem is "help me make reliable choices."

---

## What the User Wants Instead

If the product fully served the learner, it would feel like a personal Vietnamese training system, not just an analysis workspace.

The user wants:

- a place to capture real Vietnamese from life and media
- immediate explanation when confused
- persistent memory of what has been learned
- automatic review of what is likely to be forgotten
- listening and pronunciation support
- guided output practice
- clear prioritization of what to learn next
- social and register awareness
- progress that feels concrete and earned

In short:

> "Help me notice, understand, remember, pronounce, reuse, and grow."

---

## How the Ideal Product Would Work

## 1. Capture

The learner encounters Vietnamese in the wild and brings it into the system easily.

Ideal behavior:

- I paste a sentence, transcript line, or message.
- I can save source context: who said it, where it came from, link, episode, article, chat, or note.
- I can clip multiple lines from one source.
- I can mark items as "study now" or "review later."

What the user feels:

- "This product fits into my real learning life."

## 2. Understand

The system helps the learner understand meaning, structure, and social nuance quickly.

Ideal behavior:

- I get a decomposition of the sentence.
- I get the natural meaning, not just literal gloss.
- I get notes on pronouns, particles, tone, and regional usage.
- I see alternate ways to say it when appropriate.
- I see when something is formal, casual, intimate, stiff, rude, Southern, or textbooky.

What the user feels:

- "I finally get why this sentence is phrased this way."

## 3. Decide What Matters

The system identifies which items are worth learning, not just which items exist.

Ideal behavior:

- It highlights the highest-value words and patterns.
- It distinguishes one-off details from reusable structures.
- It tells me what is common, high-frequency, foundational, or situational.
- It groups related patterns into learnable families.

What the user feels:

- "I know what is worth spending memory on."

## 4. Practice Recall

The system turns saved learning into memory.

Ideal behavior:

- I open the app and immediately see what is due for review.
- I review words, phrases, particles, and grammar patterns through active recall.
- The difficulty adapts to my history.
- The system re-surfaces items I nearly forgot or repeatedly fail.
- Reviews are short, focused, and continuous.

What the user feels:

- "This is helping me actually retain Vietnamese."

## 5. Practice Listening and Pronunciation

The system closes the gap between textual understanding and spoken ability.

Ideal behavior:

- I can hear native-like playback for the sentence and its components.
- I can loop tricky audio.
- I can slow playback.
- I can record myself.
- I get pronunciation and tone feedback.
- I can do listening discrimination drills on similar sounds and tones.

What the user feels:

- "I can hear it, imitate it, and improve it."

## 6. Practice Output

The system makes the learner produce Vietnamese, not just inspect it.

Ideal behavior:

- After learning a pattern, I use it in guided exercises.
- I answer targeted prompts.
- I rewrite sentences across contexts and register levels.
- I practice choosing correct pronouns and particles.
- I get correction and explanation when I fail.

What the user feels:

- "I can now use this, not just recognize it."

## 7. Guide the Journey

The system gives the learner a path without removing flexibility.

Ideal behavior:

- I can follow a default path if I want guidance.
- I can still study from mined sentences if I prefer.
- The product connects my personal corpus to a broader learning roadmap.
- It tells me what gaps are blocking progress.

What the user feels:

- "I know where I am, what comes next, and why."

## 8. Show Real Progress

The product measures learning in a way that feels meaningful.

Ideal behavior:

- I can see recall strength.
- I can see listening gains.
- I can see how often I correctly produce a pattern.
- I can see what categories remain weak.
- I can see milestone progress in plain language.

What the user feels:

- "My Vietnamese is genuinely getting better."

---

## Ideal Core Experience

If the product is working well, a learner's loop should look like this:

1. I capture a real sentence from life.
2. The product explains it clearly and contextually.
3. It extracts the parts worth learning.
4. It schedules those parts for review.
5. It lets me hear and practice them.
6. It makes me produce them in realistic scenarios.
7. It brings them back until they stick.
8. It shows me how this connects to broader progress.

That is the real product loop.

Everything else is support.

---

## Product Principles Implied by This Point of View

If we take the user's needs seriously, the product should optimize for:

- retention over collection
- production over passive recognition
- real-world capture over isolated input boxes
- social correctness over literal translation
- guided progression over tool sprawl
- trustworthy nuance over single-answer confidence
- meaningful progress over decorative analytics

---

## Summary

Today, the product is best understood as:

- a strong Vietnamese analysis and knowledge-capture workbench

What the user actually wants is:

- a Vietnamese learning system that helps them understand, remember, hear, pronounce, and use the language naturally

The most important shift is this:

> The product should stop thinking of the learner's problem as "organize Vietnamese knowledge" and start thinking of it as "build durable Vietnamese ability."
