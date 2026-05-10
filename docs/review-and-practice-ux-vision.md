# Review & Practice: UX Vision

## What this document is

A user-experience-first design for the review and practice system.
It describes what the learner sees, feels, and does — not how it's built.

---

## The core loop

Today the app helps a learner **capture and understand** Vietnamese.
After this work, it should also help them **remember and produce** it.

The full learner loop becomes:

```
Encounter → Understand → Save → Review → Produce → Retain
```

The new surface covers the last four steps.

---

## Entry point: "Review" as a first-class destination

When the learner opens the app, they should immediately see whether anything is waiting for them.

### What they see on the dashboard or nav

- A count of items due for review: **"12 due"**
- If nothing is due: **"All caught up"** with a prompt to practice or study new material
- The count is always visible — it is the app's heartbeat

### What "due" means

An item becomes due when the SRS algorithm says the learner is likely about to forget it. The learner never needs to understand the algorithm. They just see: "You have things to review."

---

## The review session

The learner taps "Review" and enters a focused session. No sidebar, no catalog browsing, no distractions — just the current card and their answer.

### Session shape

- A session is **5–20 items** by default (learner can adjust)
- Items are a **mix of recall and production** — not separated into two modes
- The session ends with a brief summary
- Sessions are short enough to do on a phone while waiting for coffee

### Design philosophy: discrete, targeted, proof-based

Each card tests **one specific thing**. Not "do you vaguely remember this word?" but "prove you understand exactly how this works." The learner should have to think — really think — to answer correctly.

Cards are **fully AI-graded**. The learner never self-assesses. The AI evaluates their answer and determines the SRS grade on a 5-point scale:

| Grade      | Meaning                                      | SRS effect              |
| ---------- | -------------------------------------------- | ----------------------- |
| 1 — Missed | Wrong or blank                               | Reset to short interval |
| 2 — Shaky  | Partially right but real gaps                | Reduce interval         |
| 3 — Okay   | Correct but slow, uncertain, or imprecise    | Keep interval           |
| 4 — Solid  | Correct and natural                          | Increase interval       |
| 5 — Nailed | Correct, fast, with good instinct for nuance | Large interval increase |

The learner sees the grade as simple feedback ("Solid!" or "Shaky — here's why") but never picks it themselves. The AI sees their answer, evaluates it, and decides. This keeps the system honest — no inflated self-grades, no guilt-driven harsh self-grades.

### Card types

Every card targets a specific learnable, but the _way_ it tests that learnable changes based on the item type, the learner's history, and what aspect needs reinforcing. Cards are mixed together in a single session.

---

#### Card Type 1: Use It in a Sentence

**Tests:** Whether the learner can actively use a word/phrase/pattern in context.
**Prompt:** The Vietnamese item + a specific scenario.
**Task:** Write a complete sentence using this item in the given situation.

```
┌──────────────────────────────────────┐
│                                      │
│   Use 「thì ra là」 in a sentence:   │
│                                      │
│   Situation: You just found out      │
│   your friend secretly got married   │
│   last month. Tell another friend.   │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   Your answer:                       │
│   "Thì ra là nó cưới rồi!"          │
│                                      │
│   Solid!                             │
│                                      │
│   Natural and correct. "Nó" works    │
│   perfectly for a friend in casual   │
│   speech.                            │
│                                      │
│   A slightly more complete version:  │
│   "Thì ra là nó cưới tháng          │
│    trước rồi!"                       │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** The learner can't just recognize the phrase — they have to deploy it naturally in a real-feeling scenario. The scenario forces them to also choose pronouns, tense markers, and register, proving understanding beyond the target item.

---

#### Card Type 2: What's Wrong Here?

**Tests:** Whether the learner understands the boundaries of correct usage.
**Prompt:** A Vietnamese sentence that contains a specific error related to the target item.
**Task:** Identify what's wrong and fix it.

```
┌──────────────────────────────────────┐
│                                      │
│   Something is off in this           │
│   sentence. What, and why?           │
│                                      │
│   Context: A student emails          │
│   their university professor.        │
│                                      │
│   "Tao muốn hỏi thầy về bài         │
│    thi ngày mai."                    │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   Your answer:                       │
│   "Tao is wrong, should be Em"       │
│                                      │
│   Nailed!                            │
│                                      │
│   "Tao" is extremely casual —        │
│   only for close friends. A student  │
│   writing to a professor should      │
│   use "em" (to "thầy").              │
│                                      │
│   Corrected:                         │
│   "Em muốn hỏi thầy về bài thi      │
│    ngày mai."                        │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** Finding errors requires deeper processing than recognition. The learner has to understand the rules well enough to detect a violation. The social context makes it concrete — this isn't abstract grammar, it's "you'd embarrass yourself saying this."

---

#### Card Type 3: Pick the Right One

**Tests:** Discrimination between similar or confusable items.
**Prompt:** A sentence with a blank + multiple plausible options.
**Task:** Choose the correct one. Optionally explain why.

```
┌──────────────────────────────────────┐
│                                      │
│   Which fits?                        │
│                                      │
│   "Chị ấy nói ___ anh ấy            │
│    không đến."                       │
│                                      │
│   (She said that he's not coming.)   │
│                                      │
│   [ là ]  [ rằng ]  [ mà ]  [ vì ]  │
│                                      │
│   Why?                               │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   You picked: rằng                   │
│   Your reason: "rằng introduces      │
│   reported speech"                   │
│                                      │
│   Nailed!                            │
│                                      │
│   "Rằng" and "là" can both work      │
│   here — both introduce reported     │
│   speech. "Rằng" is slightly more    │
│   formal/written. "Mà" would mean    │
│   "who/that" (relative clause),      │
│   and "vì" means "because" — both    │
│   change the meaning entirely.       │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** Multiple-choice alone is too easy to guess. The optional "why?" field is where real understanding is proven. The AI grades the explanation — a correct pick with a wrong reason counts as "shaky," because the learner might have guessed.

---

#### Card Type 4: Shift the Register

**Tests:** Whether the learner can transform a sentence across social contexts.
**Prompt:** A correct Vietnamese sentence + a new social scenario.
**Task:** Rewrite it for the new context.

```
┌──────────────────────────────────────┐
│                                      │
│   Same idea, different situation:    │
│                                      │
│   "Mình ăn gì đi!"                  │
│   (to your partner — "Let's go      │
│    eat something!")                   │
│                                      │
│   → Now say this to a group of       │
│     coworkers you're friendly with   │
│     but not super close to.          │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   Your answer:                       │
│   "Mọi người ơi, mình đi ăn         │
│    gì đi!"                           │
│                                      │
│   Solid!                             │
│                                      │
│   Good instinct using "mọi người"    │
│   to address the group. "Mình" as    │
│   "we" works in this friendly-but-   │
│   not-intimate context.              │
│                                      │
│   Also natural:                      │
│   "Tụi mình đi ăn gì đi!" (more     │
│   casual Southern style)             │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** This is the hardest card type and the most valuable. It forces the learner to understand not just vocabulary but the social machinery of Vietnamese. Every pronoun, every particle, every framing word might need to change.

---

#### Card Type 5: Complete the Thought

**Tests:** Whether the learner can predict natural Vietnamese phrasing.
**Prompt:** The beginning of a Vietnamese sentence + context about what the speaker wants to say.
**Task:** Finish the sentence naturally.

```
┌──────────────────────────────────────┐
│                                      │
│   Complete this naturally:           │
│                                      │
│   Your friend is telling you about   │
│   a restaurant that looked good      │
│   but the food was actually bad.     │
│                                      │
│   "Nhìn thì ngon nhưng mà..."       │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** Sentence completion forces the learner to think _inside_ Vietnamese. They have to predict the natural continuation — the right conjunction, the right contrast structure, the right tone. It builds fluency instinct, not just recall.

---

#### Card Type 6: What Does This Actually Mean?

**Tests:** Deep comprehension, not dictionary lookup.
**Prompt:** A Vietnamese sentence in a specific context.
**Task:** Explain what it really means — the social subtext, not just the literal words.

```
┌──────────────────────────────────────┐
│                                      │
│   What is this person really         │
│   saying?                            │
│                                      │
│   Context: Your Vietnamese           │
│   mother-in-law, after tasting       │
│   food you cooked:                   │
│                                      │
│   "Cũng được."                       │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   Your answer:                       │
│   "It's okay but not great, she's    │
│    being polite about it"            │
│                                      │
│   Solid!                             │
│                                      │
│   Literally "also okay/acceptable"   │
│   but in this context it's faint     │
│   praise — closer to "it's passable" │
│   or "not bad I guess." From a       │
│   mother-in-law about your cooking,  │
│   this is diplomatic disappointment. │
│                                      │
│   Compare: "Ngon lắm!" would be     │
│   genuine praise.                    │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** This is the inverse of production — it tests whether the learner can read between the lines. Vietnamese communication is heavily contextual. A learner who only knows dictionary meanings will miss the real message.

---

#### Card Type 7: How Would You Say This?

**Tests:** Synthesis — can the learner combine multiple things they've learned into one natural sentence?
**Prompt:** An English idea + a social scenario. The sentence is engineered to require several learnables the learner has saved.
**Task:** Produce the full Vietnamese sentence.

The key design: the AI constructs the prompt so that the answer naturally uses **4–5 learnables the learner is already confident with** plus **1–2 they're weak on or recently learned**. The strong items are scaffolding — the learner isn't struggling with every word. But the weak items are embedded in a real sentence, so the learner has to use them naturally alongside what they already know.

```
┌──────────────────────────────────────┐
│                                      │
│   How would you say this?            │
│                                      │
│   You're texting a close friend      │
│   (same age, female). Tell her:      │
│                                      │
│   "It turns out the restaurant       │
│    we went to last week already      │
│    closed down."                     │
│                                      │
│   ┌──────────────────────────────┐   │
│   │                              │   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Check ]                          │
│                                      │
└──────────────────────────────────────┘
```

After checking:

```
┌──────────────────────────────────────┐
│                                      │
│   Your answer:                       │
│   "Thì ra là quán mình đi tuần      │
│    trước đóng cửa rồi."             │
│                                      │
│   Nailed!                            │
│                                      │
│   ✓ "thì ra là" — perfect use        │
│   ✓ "quán" — correct classifier      │
│   ✓ "mình đi" — natural for close    │
│     friend context                   │
│   ✓ "tuần trước" — correct           │
│   ✓ "đóng cửa rồi" — natural        │
│     phrasing for "closed down"       │
│                                      │
│   [ Next ]                           │
│                                      │
└──────────────────────────────────────┘
```

**Why this works:** This is the closest thing to real-life production. The learner has to pull together vocabulary, grammar, register, and structure all at once. But because most of the required items are ones they're already strong on, it doesn't feel impossible — it feels like a real sentence they _almost_ know how to say, with one or two pieces they have to reach for. That reaching is where learning happens.

The AI feedback breaks down each learnable it was testing, so the learner sees exactly which parts they got right and which need work. The SRS grade is weighted toward the weak items — nailing the strong ones is expected, but getting the weak ones right in context is what matters.

---

### How the AI picks card types

The system doesn't randomly assign card types. It chooses based on what will most effectively test the target learnable:

- **Vocabulary items** → Use It in a Sentence, Pick the Right One, Complete the Thought, How Would You Say This?
- **Grammar patterns** → Use It in a Sentence, What's Wrong Here?, Complete the Thought, How Would You Say This?
- **Pronouns / register** → What's Wrong Here?, Shift the Register, What Does This Actually Mean?
- **Particles / connectors** → Pick the Right One, What's Wrong Here?, Complete the Thought
- **Phrases / idioms** → What Does This Actually Mean?, Use It in a Sentence, Shift the Register
- **Multiple weak items due together** → How Would You Say This? (bundles them into one prompt)

For items the learner keeps failing, the system escalates to harder card types that force deeper engagement. An item you keep missing on "Pick the Right One" gets promoted to "Use It in a Sentence" — you can't guess your way through production.

"How Would You Say This?" is also the system's best card for recently-introduced items. Instead of testing a brand-new word in isolation (where the learner has no anchor), it embeds the new word alongside familiar ones. The learner thinks "I know most of this sentence, I just need to figure out this one new piece" — which is exactly how natural acquisition works.

### AI grading

Every card is AI-graded. The AI receives:

- The target learnable and its metadata
- The card type and prompt
- The learner's answer
- The learner's history with this item

It returns:

- A **grade** (1–5)
- A **short feedback message** (1–3 sentences, conversational)
- Optionally: an **alternative phrasing** or **correction** with explanation
- Optionally: a **nuance note** (something the learner might not have considered)

The feedback should feel like a knowledgeable friend reacting to your Vietnamese — not a test score. "Nailed it, that's exactly how you'd say it" or "Close! You got the meaning but 'rằng' is more natural here than 'là' in formal writing."

---

## What happens between sessions

### The learnable lifecycle

Every item in the catalog can now be in one of these states from the learner's perspective:

1. **New** — Saved but never reviewed. Waiting to enter the queue.
2. **Learning** — Recently introduced. Being reviewed at short intervals (minutes to hours to a day).
3. **Reviewing** — In the long-term rotation. Intervals grow from days to weeks to months.
4. **Mature** — Interval is long (30+ days). The learner reliably knows this.

The learner doesn't need to see these labels unless they want to. What they see is:

- Items due now
- Items they've been struggling with
- Items they've mastered

### New item introduction

The system doesn't dump all saved items into the review queue at once. It introduces **a few new items per day** (configurable, default ~10). This prevents the queue from becoming overwhelming after a big analysis session.

When a learner saves 30 items from a workspace, those items enter a "new" pool. Each day, the system pulls a handful into active review alongside due items.

### Struggling items

If a learner repeatedly fails an item (e.g., 3+ failures in recent reviews), it gets flagged:

- Shown more frequently
- Shown with additional context (more examples, related items)
- Surfaced in the session summary: "You keep missing these — want to study them?"

---

## Session summary

After completing a review session, the learner sees a brief summary:

```
┌──────────────────────────────────────┐
│                                      │
│   Session complete                   │
│                                      │
│   15 cards · 12 solid · 2 shaky · 1 missed
│                                      │
│   ┌──────────────────────────────┐   │
│   │ Needs more work:             │   │
│   │                              │   │
│   │ • "rằng" vs "là" — you keep  │   │
│   │   mixing these up in formal  │   │
│   │   contexts                   │   │
│   │                              │   │
│   │ • Pronoun choice with older  │   │
│   │   non-family — missed "anh/  │   │
│   │   chị" framing twice         │   │
│   └──────────────────────────────┘   │
│                                      │
│   Streak: 4 days                     │
│                                      │
│   [ Done ] [ Drill weak items ]      │
│                                      │
└──────────────────────────────────────┘
```

The summary is specific about _what_ the learner is struggling with, not just that they struggled. "Drill weak items" launches a short Practice session targeting exactly those gaps.

---

## Practice outside of SRS

Not all production practice needs to be SRS-driven. The learner should also be able to do **freeform practice** when they want to actively drill.

### "Practice" mode

A separate entry point (sibling to "Review") where the learner can:

- **Practice recently saved items** — drill on items from a specific workspace or recent analysis
- **Practice a category** — drill all particles, all pronouns, all grammar patterns
- **Practice weak items** — drill items they keep failing
- **Practice random production** — the system picks a scenario and asks the learner to produce

Practice sessions don't affect SRS scheduling. They're pure exercise. But performance is tracked and can influence what the SRS prioritizes.

---

## How review connects to existing features

### From the catalog

Each learnable in the catalog shows its review state:

- Next review date
- Current interval
- Number of times reviewed
- Success rate
- A small retention strength indicator

The learner can tap any catalog item and do a quick one-off review or practice.

### From a workspace

After saving a workspace (analyzing a sentence), the system offers:

- "Review these items now?" — starts a mini-session with just the newly saved items
- Or the items silently enter the new-item pool for gradual introduction

### From the chat

The chat AI can reference the learner's review state:

- "You've been struggling with 'rằng' vs 'là' — want to practice that?"
- "You haven't reviewed particles in a while — your recall might be fading"

---

## Navigation changes

The Vietnamese tools section currently has:

- Analyze
- Explain
- Chat
- Catalog
- Sentences
- Insights

After this work:

- **Review** — the SRS session (with due count badge)
- **Practice** — freeform production drills
- Analyze
- Explain
- Chat
- Catalog
- Sentences
- Insights

Review and Practice are promoted to the top because they represent the daily habit. The rest are tools you reach for when needed.

---

## Mobile-first consideration

Review sessions should work well on mobile. This means:

- Large tap targets for grading buttons
- Minimal scrolling per card
- Input fields that work well with phone keyboards (Vietnamese keyboard)
- Sessions that can be completed in 2-5 minutes

---

## What success looks like

The learner opens the app daily. They see "8 due." They tap Review and spend 3 minutes going through a mix of recall and production cards. They get feedback on their Vietnamese. They see which items they're struggling with. They close the app knowing they did something real.

Over weeks, items they once struggled with become mature. New items flow in from their ongoing analysis sessions. The graph of what they know grows, and the review system is what makes it stick.

The product shifts from "I analyzed some Vietnamese" to "I am learning Vietnamese."
