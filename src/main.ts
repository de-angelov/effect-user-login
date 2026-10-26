import { createServer } from "node:http";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { HttpServer } from "@effect/platform";
import { Effect, Layer } from "effect";

import { Auth } from "./auth.js";
import { ServerConfig } from "./config.js";
import { router } from "./http.js";

const server = router.pipe(HttpServer.serve(), HttpServer.withLogAddress);

const ServerLive = server.pipe(
  Layer.provide(Auth.Default),
  Layer.provide(NodeHttpServer.layerConfig(createServer, ServerConfig))
);

NodeRuntime.runMain(
  Layer.launch(ServerLive).pipe(
    Effect.tapErrorCause((cause) =>
      Effect.logError("Server failed to start", cause)
    )
  )
);
