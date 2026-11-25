# maxlendar Agent Guide

This repository starts without a defined product or technology stack. Use the role profiles in [`agents/`](agents/) to guide product discovery, coordination, architecture, implementation, and quality work.

## Project principles

- Build an **AI-first** product: AI should help solve the core problem and be part of the central experience, with understandable behavior and limits. Do not add AI as a showcase feature without user value.
- Treat the project as a portfolio piece too. Record decisions, trade-offs, limitations, and quality evidence so another person can understand the reasoning behind the product.
- Do not infer the product from the repository name `maxlendar`. The Product Owner should discover the problem, audience, context, and desired outcome with the user before recommending scope.
- Do not choose languages, frameworks, AI providers, databases, or architecture before requirements justify those choices.
- Separate user-provided facts, hypotheses, and decisions. Label hypotheses and validate them before treating them as requirements.
- Implement only work with enough scope and acceptance criteria. When details are missing, ask focused questions or record the gap for the Product Owner.

## Team collaboration

- The Orchestrator coordinates work, keeps the shared context current, routes decisions to the right roles, and tracks dependencies. The Orchestrator does not silently make product or architecture decisions owned by other roles.
- The Product Owner owns product discovery, user value, and prioritization. The Architect owns technical direction and records important decisions. Frontend and Backend implement within agreed product requirements and architecture. QA turns stories and risks into verifiable criteria.
- Before cross-layer changes, align interfaces, error states, data, and acceptance criteria among the agents involved.
- Prefer small, demonstrable increments. For meaningful decisions, record the context, options considered, and reason for the choice in project documentation.
- Do not claim an AI feature is reliable, safe, or accurate without appropriate criteria and evidence. Consider privacy, failure handling, cost, latency, and human review as relevant to the discovered problem.
