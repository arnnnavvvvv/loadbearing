function buildCurve(breakingPoint) {
  const curve = [];
  for (let vu = 0; vu <= 100; vu += 5) {
    let p95;
    if (breakingPoint === null || vu < breakingPoint) {
      p95 = 40 + vu * 1.5;
    } else {
      p95 = 100 + Math.pow(vu - breakingPoint, 2) * 3;
    }
    const errorRate =
      breakingPoint !== null && vu >= breakingPoint
        ? Math.min(0.9, (vu - breakingPoint) / 60)
        : 0;
    curve.push({ vu, p95: Math.round(p95), errorRate: Number(errorRate.toFixed(2)) });
  }
  return curve;
}

const BROKEN = {
  repoUrl: null,
  verdict: "fail",
  breakingPoint: 40,
  curve: buildCurve(40),
  staticFlags: [
    {
      rule: "noConnectionPool",
      file: "src/db.js",
      severity: "high",
      message: "A new database connection is opened on every request instead of reusing a pool."
    },
    {
      rule: "unindexedQuery",
      file: "src/routes/products.js",
      severity: "medium",
      message: "Products are filtered by category, but the category column has no index."
    }
  ],
  diagnosis: {
    cause: "connection_pool_exhaustion",
    headline: "Breaks at ~40 concurrent users",
    explanation:
      "Your app opens a new database connection for every request instead of reusing them. Under load the database runs out of available connections and requests start failing."
  },
  fixPrompt:
    "Refactor the database layer to use a single shared connection pool (e.g. pg.Pool) created once at startup, instead of opening a new client on every request. Reuse the pool across all queries."
};

const HEALTHY = {
  repoUrl: null,
  verdict: "pass",
  breakingPoint: null,
  curve: buildCurve(null),
  staticFlags: [],
  diagnosis: {
    cause: "none",
    headline: "Holds past 100 concurrent users",
    explanation:
      "No significant bottlenecks found. Connections are pooled and the hot query is indexed, so the app stays responsive across the full load range."
  },
  fixPrompt: null
};

export function mockResult(repoUrl, mode = "broken") {
  const base = mode === "healthy" ? HEALTHY : BROKEN;
  return { ...base, repoUrl };
}