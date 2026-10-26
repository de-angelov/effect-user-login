import { Effect } from "effect";
import { SqlClient } from "@effect/sql";
import type { SqlError } from "@effect/sql/SqlError";

import { DatabaseError, UsernameTaken } from "./errors.js";

export interface User {
  readonly id: number;
  readonly username: string;
}

interface UserWithPassword extends User {
  readonly password_hash: string;
}

const isUniqueViolation = (error: SqlError): boolean => {
  const cause = error.cause as { readonly code?: string } | undefined;
  return cause?.code === "23505";
};

const toDatabaseError = (error: SqlError): DatabaseError =>
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
    `;

    yield* sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
      )
    `;

    const createUser = (
      username: string,
      passwordHash: string
    ): Effect.Effect<User, UsernameTaken | DatabaseError> =>
      sql<{ id: number; username: string }>`
        INSERT INTO users (username, password_hash)
        VALUES (${username}, ${passwordHash})
        RETURNING id, username
      `.pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            isUniqueViolation(error)
              ? new UsernameTaken({ message: "That username is already taken." })
              : toDatabaseError(error)
          )
        ),
        Effect.flatMap((rows) => {
          const user = rows[0];
          return user
            ? Effect.succeed(user)
            : Effect.fail(new DatabaseError({ message: "Could not create the user." }));
        })
      );

    const findUserByUsername = (
      username: string
    ): Effect.Effect<UserWithPassword | null, DatabaseError> =>
      sql<{ id: number; username: string; password_hash: string }>`
        SELECT id, username, password_hash
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `.pipe(
        Effect.map((rows) => rows[0] ?? null),
        Effect.mapError(toDatabaseError)
      );

    const createSession = (token: string, userId: number): Effect.Effect<void, DatabaseError> =>
      sql`
        INSERT INTO sessions (token, user_id)
        VALUES (${token}, ${userId})
      `.pipe(Effect.asVoid, Effect.mapError(toDatabaseError));

    const findUserBySession = (token: string): Effect.Effect<User | null, DatabaseError> =>
      sql<{ id: number; username: string }>`
        SELECT u.id, u.username
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${token}
          AND s.expires_at > NOW()
        LIMIT 1
      `.pipe(
        Effect.map((rows) => rows[0] ?? null),
        Effect.mapError(toDatabaseError)
      );

    const deleteSession = (token: string): Effect.Effect<void, DatabaseError> =>
      sql`
        DELETE FROM sessions
        WHERE token = ${token}
      `.pipe(Effect.asVoid, Effect.mapError(toDatabaseError));

    return {
      createUser,
      findUserByUsername,
      createSession,
      findUserBySession,
      deleteSession
    };
  })
}) {}
