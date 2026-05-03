---
name: council-forum
description: Convene a 5-expert council to review code, critique a plan, or debate an architectural decision within the codebase. Grounded in hexagonal architecture and 100% test coverage policy.
---

# Council Forum

Convene five domain experts to review code or plans. Each expert reviews independently — authentic disagreement is more valuable than consensus. Experts may and should push back on each other where they genuinely diverge.

## Grounding

Experts MUST ensure reviews align with the project's guiding principles:

- **Hexagonal Architecture**: Core (domain) vs. Dependency (adapters/infrastructure).
- **100% Coverage Policy**: Mandatory for Core, Dependency, and Utils.
- **Idempotency** and **Observability**.

## Modes

- **Review Mode**: Triggered when input references code, file paths, or a diff.
- **Design Mode**: Triggered when input is a plan, proposal, design question, or architectural debate.

If unclear, ask the user which mode before proceeding.

## The Five Experts

### 1 — Domain Architect

_Hexagonal architecture, Bounded Contexts, package structure._
Asks: Is logic in `core` or leaking into `dependency`? Is the boundary between domain concepts respected?

### 2 — Type Systems Engineer

_TypeScript safety, Branded IDs, Drizzle Schema, tRPC contracts._
Asks: Are IDs branded? Does the Drizzle schema use typed columns? Are there `any` or `as X` escapes?

### 3 — Adapter Purity Inspector

_Boundary cleanliness, Port/Facade implementation, External API isolation._
Asks: Does the adapter only translate? Is domain logic leaking into converter functions?

### 4 — Developer Experience Critic

_Naming, Voice Guide alignment, Contributor friction._
Asks: Does naming follow the "action + context" pattern? Would a new SDE understand the flow in 5 minutes?

### 5 — Consistency & Test Auditor

_Convention enforcement, 100% Coverage alignment, Idempotency, Observability._
Asks: Is this write handler idempotent? Is it testable without excessive mocking? Does it align with the 100% coverage policy?

## Workflow: Review Mode

**Phase 1 — Research & Read**
Use `read_file` to read referenced files in full. Use `grep_search` or `list_directory` to see how adjacent modules handle similar logic.

**Phase 2 — Individual Verdicts**
For each expert, in order:

- **Grade**: A / B / C / D / F
- **Findings**: 2–5 bullets citing specific file:line or quoting code.
- **Top fix**: One concrete, actionable recommendation.

**Phase 3 — Cross-Expert Discussion**
3–6 exchanges where experts respond to each other's most important findings.

**Phase 4 — Council Verdict**

| Expert              | Grade | Single Most Important Fix |
| ------------------- | ----- | ------------------------- |
| Domain Architect    | ?     | …                         |
| Type Systems        | ?     | …                         |
| Adapter Purity      | ?     | …                         |
| DX Critic           | ?     | …                         |
| Consistency Auditor | ?     | …                         |

- **Overall grade**: Median grade.
- **Must-fix**: The one change that ≥2 experts independently flagged as highest priority.

## Workflow: Design Mode

**Phase 1 — Research & Read**
Read referenced files or plan text. Read existing code to validate feasibility and architectural fit.

**Phase 2 — Individual Verdicts**
For each expert, in order:

- **Position**: Strongly For / For / Neutral / Against / Strongly Against
- **Findings**: 2–5 bullets citing specific decisions.
- **Recommendation**: One concrete change or clarification.

**Phase 3 — Cross-Expert Discussion**
3–6 exchanges focused on the most contested decision in the plan.

**Phase 4 — Council Verdict**

| Expert              | Position | Key Concern or Endorsement |
| ------------------- | -------- | -------------------------- |
| Domain Architect    | ?        | …                          |
| Type Systems        | ?        | …                          |
| Adapter Purity      | ?        | …                          |
| DX Critic           | ?        | …                          |
| Consistency Auditor | ?        | …                          |

- **Overall stance**: Majority position.
- **Blocking issue**: One unresolved problem making the plan risky.

## Grading Standards

| Grade | Meaning                                               |
| ----- | ----------------------------------------------------- |
| **A** | Exemplary — follows all principles, reference quality |
| **B** | Good with minor issues — shippable, easy to improve   |
| **C** | Works but has problems causing friction or debt       |
| **D** | Significant violations — needs substantial revision   |
| **F** | Do not ship — structural/architectural problems       |
