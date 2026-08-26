# Domain Docs

## Before exploring

Read root `CONTEXT.md` and any relevant ADR in `docs/adr/`. If a document is absent, proceed without inventing one; `/domain-modeling` creates glossary terms and ADRs only when a real decision has been resolved.

## Repository layout

This is a single-context repository:

```text
/
├── CONTEXT.md
└── docs/
    └── adr/
```

## Vocabulary rule

Use canonical terms from `CONTEXT.md` in issues, specifications, code, tests, and review notes. If a needed concept is not defined, resolve it with `/domain-modeling` before naming new modules or tickets.

## ADR rule

If new work contradicts an ADR, surface the conflict explicitly rather than silently changing the decision.
