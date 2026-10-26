import { Config, Redacted } from "effect";

const defaultDatabaseUrl =
  "postgres://postgres:postgres@localhost:5432/effect_login";

export const ServerConfig = Config.all({
  host: Config.string("HOST").pipe(Config.withDefault("127.0.0.1")),
  port: Config.port("PORT").pipe(Config.withDefault(3000))
});

export const DatabaseConfig = {
  url: Config.redacted("DATABASE_URL").pipe(
    Config.withDefault(Redacted.make(defaultDatabaseUrl))
  )
};
