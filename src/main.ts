import { createServer } from "node:http";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, Redacted } from "effect";
import { HttpServer } from "@effect/platform";

import { Auth } from "./auth.js";
import { Database } from "./database.js";
import { createRouter } from "./http.js";
import { PasswordHasher } from "./password.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/effect_login";

const DatabaseLive = Database.Default.pipe(
  Layer.provide(PgClient.layer({ url: Redacted.make(databaseUrl) }))
);

const AuthLive = Auth.Default.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(PasswordHasher.Default)
);

const program = Effect.gen(function* () {
  const auth = yield* Auth;
  const router = createRouter(auth);
  const server = router.pipe(HttpServer.serve(), HttpServer.withLogAddress);
  return yield* Layer.launch(server);
}).pipe(
  Effect.provide(AuthLive),
  Effect.provide(NodeHttpServer.layer(() => createServer(), { host, port })),
  Effect.catchAll((error) => Effect.logError(`Server failed to start: ${error}`))
);

NodeRuntime.runMain(program);
