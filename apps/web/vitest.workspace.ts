// Two Vitest projects:
//  - "unit"    : pure logic + React components (happy-dom, fast).
//  - "workers" : D1-backed integration tests running inside workerd (Miniflare).
export default ["./vitest.unit.config.ts", "./vitest.workers.config.ts"];
