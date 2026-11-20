// Snapshots the OpenF1 responses behind the dashboard pages into src/assets/openf1, which is
// committed. OpenF1 closes its free API while a session is live, and fresh server instances have
// no cache yet, so this is what keeps the dashboards filled then. Re-run after a race weekend,
// outside a live session: npm run snapshot:dashboards
// package.json sets OPENF1_WRITE_SEED so the cache writes there.
import { CURRENT_YEAR } from "../src/lib/f1/resolve";
import { runF1Tool } from "../src/lib/f1/tools";

// The calls in src/components/dashboards.
const calls: Array<[string, Record<string, unknown>]> = [
  ["get_schedule", { include_sessions: true }],
  ["get_standings", { kind: "drivers" }],
  ["get_standings", { kind: "teams" }],
  ["get_standings", { view: "progression", top: 22 }],
  ["get_standings", { kind: "teams", view: "progression", top: 11 }],
  ["get_results", {}],
];
const schedule = (await runF1Tool(...calls[0])) as { rows: Array<{ status: string; location: string }> };
const next = schedule.rows.find((r) => r.status === "next" || r.status === "in progress");
if (next) calls.push(["get_results", { session: `${CURRENT_YEAR - 1} ${next.location}` }]);

for (const [tool, args] of calls.slice(1)) {
  await runF1Tool(tool, args);
  console.log(`${tool} ${JSON.stringify(args)}`);
}
console.log("Done. Commit src/assets/openf1.");
