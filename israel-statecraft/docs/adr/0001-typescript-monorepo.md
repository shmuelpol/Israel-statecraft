# ADR 0001 — Single TypeScript package, no framework server

**Decision.** One npm package; engine/AI/server/client as folders sharing `engine/src/types.ts`. Server is Node `http` + `ws` only.

**Alternatives.** (a) npm workspaces / turborepo — rejected: overhead with zero consumers besides ourselves; (b) Express/Fastify — rejected: ~12 routes and one socket don't justify the dependency surface; (c) Electron — rejected: browser + local server satisfies "locally runnable" with far less packaging risk on Windows.

**Consequences.** Shared strict types across AI boundary; fewer licenses to audit; a hand-rolled router (~80 lines) we fully control. Trade-off: no framework conveniences (acceptable at this scale).
