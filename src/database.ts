import { Effect, Option, Schema } from "effect";
import { Model, SqlClient, SqlSchema } from "@effect/sql";
import type { SqlError } from "@effect/sql/SqlError";
import { PgClient } from "@effect/sql-pg";

import { DatabaseConfig } from "./config.js";
import {
  HashedPassword,
  SessionToken,
  UserId,
  Username
} from "./domain.js";
import { DatabaseError, UsernameTaken } from "./errors.js";

export class User extends Model.Class<User>("User")({
  id: Model.Generated(UserId),
  username: Username,
  passwordHash: Schema.propertySignature(HashedPassword).pipe(
    Schema.fromKey("password_hash")
  )
}) {}

export const CurrentUser = Schema.Struct({
  id: UserId,
  username: Username
});
export type CurrentUser = Schema.Schema.Type<typeof CurrentUser>;

const CreateUserRequest = Schema.Struct({
  username: Username,
  passwordHash: Schema.propertySignature(HashedPassword).pipe(
    Schema.fromKey("password_hash")
  )
});

const FindUserByUsernameRequest = Schema.Struct({
  username: Username
});

const FindUserBySessionRequest = Schema.Struct({
  token: SessionToken
});

const CreateSessionRequest = Schema.Struct({
  token: SessionToken,
  userId: UserId
});

const DeleteSessionRequest = Schema.Struct({
  token: SessionToken
});

const isUniqueViolation = (error: SqlError): boolean => {
  const cause = error.cause as { readonly code?: string } | undefined;
  return cause?.code === "23505";
};

const toDatabaseError = (error: unknown): DatabaseError =>
  new DatabaseError({ message: "Database query failed.", cause: error });

export class Database extends Effect.Service<Database>()("Database", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.pipe(Effect.mapError(toDatabaseError));

    yield* sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
      )
    `.pipe(Effect.mapError(toDatabaseError));

    const createUserQuery = SqlSchema.findOne({
      Request: CreateUserRequest,
      Result: User,
      execute: ({ username, password_hash }) => sql`
        INSERT INTO users (username, password_hash)
        VALUES (${username}, ${password_hash})
        RETURNING id, username, password_hash
      `
    });

    const findUserByUsernameQuery = SqlSchema.findOne({
      Request: FindUserByUsernameRequest,
      Result: User,
      execute: ({ username }) => sql`
        SELECT id, username, password_hash
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `
    });

    const findUserBySessionQuery = SqlSchema.findOne({
      Request: FindUserBySessionRequest,
      Result: CurrentUser,
      execute: ({ token }) => sql`
        SELECT u.id, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${token}
          AND s.expires_at > NOW()
        LIMIT 1
      `
    });

    const createSessionQuery = SqlSchema.void({
      Request: CreateSessionRequest,
      execute: ({ token, userId }) => sql`
        INSERT INTO sessions (token, user_id)
        VALUES (${token}, ${userId})
      `
    });

    const deleteSessionQuery = SqlSchema.void({
      Request: DeleteSessionRequest,
      execute: ({ token }) => sql`
        DELETE FROM sessions
        WHERE token = ${token}
      `
    });

    const createUser = Effect.fn("Database.createUser")(
      function* (
        username: Username,
        passwordHash: HashedPassword
      ): Effect.fn.Return<User, UsernameTaken | DatabaseError> {
        const maybeUser = yield* createUserQuery({ username, passwordHash }).pipe(
          Effect.catchAll(
            (error): Effect.Effect<never, UsernameTaken | DatabaseError> => {
              if (error._tag === "SqlError" && isUniqueViolation(error)) {
                return Effect.fail(
                  new UsernameTaken({
                    message: "That username is already taken."
                  })
                );
              }

              return Effect.fail(toDatabaseError(error));
            }
          )
        );

        return yield* Option.match(maybeUser, {
          onNone: () =>
            Effect.fail(
              new DatabaseError({ message: "Could not create the user." })
            ),
          onSome: Effect.succeed
        });
      }
    );

    const findUserByUsername = Effect.fn("Database.findUserByUsername")(
      function* (
        username: Username
      ): Effect.fn.Return<Option.Option<User>, DatabaseError> {
        return yield* findUserByUsernameQuery({ username }).pipe(
          Effect.mapError(toDatabaseError)
        );
      }
    );

    const createSession = Effect.fn("Database.createSession")(
      function* (
        token: SessionToken,
        userId: UserId
      ): Effect.fn.Return<void, DatabaseError> {
        yield* createSessionQuery({ token, userId }).pipe(
          Effect.mapError(toDatabaseError)
        );
      }
    );

    const findUserBySession = Effect.fn("Database.findUserBySession")(
      function* (
        token: SessionToken
      ): Effect.fn.Return<Option.Option<CurrentUser>, DatabaseError> {
        return yield* findUserBySessionQuery({ token }).pipe(
          Effect.mapError(toDatabaseError)
        );
      }
    );

    const deleteSession = Effect.fn("Database.deleteSession")(
      function* (
        token: SessionToken
      ): Effect.fn.Return<void, DatabaseError> {
        yield* deleteSessionQuery({ token }).pipe(
          Effect.mapError(toDatabaseError)
        );
      }
    );

    return {
      createUser,
      findUserByUsername,
      createSession,
      findUserBySession,
      deleteSession
    };
  }),
  dependencies: [PgClient.layerConfig(DatabaseConfig)]
}) {}
