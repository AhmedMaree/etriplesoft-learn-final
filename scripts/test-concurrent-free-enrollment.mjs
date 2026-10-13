import { spawn, spawnSync } from "node:child_process";

// Deliberately targets only this repository's local Supabase database. Never point this
// concurrency test at Hosted DEV or a production database.
const container = "supabase_db_etriplesoft-learn-local";
const userId = "00000000-0000-4000-8000-000000000001";
const courseId = "c0000000-0000-4000-8000-000000000002";

function psql(sql) {
  const result = spawnSync(
    "docker",
    ["exec", container, "psql", "-X", "-A", "-t", "-F", "|", "-U", "postgres", "-d", "postgres", "-c", sql],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Local PostgreSQL query failed.");
  return result.stdout.trim();
}

function runPgbench(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      ["exec", "-i", container, "pgbench", "-h", "/var/run/postgresql", "-U", "postgres", "-d", "postgres", "-n", "-c", "8", "-t", "1", "-f", "-"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout + stderr);
      else reject(new Error(stderr.trim() || `pgbench exited with status ${code}.`));
    });
    child.stdin.end(script);
  });
}

const setup = psql(`
  SELECT
    (SELECT count(*) FROM public.profiles WHERE id = '${userId}')::integer,
    (SELECT count(*) FROM public.courses WHERE id = '${courseId}' AND status = 'published' AND price_minor = 0)::integer,
    (SELECT count(*) FROM public.enrollments WHERE user_id = '${userId}' AND course_id = '${courseId}')::integer
`);
if (setup !== "1|1|0") {
  throw new Error("Expected the seeded free-course fixture and no existing test enrollment; no rows were changed.");
}

let testEnrollmentCreated = false;
try {
  testEnrollmentCreated = true;
  const output = await runPgbench(
    `SET request.jwt.claim.sub = '${userId}';\n` +
    `SET request.jwt.claims = '{"sub":"${userId}","role":"authenticated"}';\n` +
    `SELECT public.learner_grant_free_enrollment('${courseId}');\n`,
  );
  const result = psql(`
    SELECT count(*)::integer, count(*) FILTER (WHERE status = 'active')::integer
    FROM public.enrollments WHERE user_id = '${userId}' AND course_id = '${courseId}'
  `);
  if (result !== "1|1") throw new Error(`Expected one active enrollment after 8 concurrent grants; observed ${result}.`);
  process.stdout.write("Eight concurrent local grants produced exactly one active enrollment.\n");
  process.stdout.write(output.match(/number of transactions actually processed:.*\n/)?.[0] ?? "");
} finally {
  if (testEnrollmentCreated) {
    psql(`DELETE FROM public.enrollments WHERE user_id = '${userId}' AND course_id = '${courseId}' AND status = 'active' AND grant_source = 'free'`);
  }
}
