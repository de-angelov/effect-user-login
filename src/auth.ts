import { Effect } from "effect";
import { randomBytes } from "node:crypto";

import { Database, type User } from "./database.js";
import {
  type AppError,
  type CryptoError,
  DatabaseError,
  InvalidCredentials,
  ValidationError
} from "./errors.js";
import { PasswordHasher } from "./password.js";

interface Session {
  readonly user: User;
  readonly token: string;
}

const validate = (
  username: string,
  password: string
): Effect.Effect<void, ValidationError> => {
  if (username.length < 3) {
    return Effect.fail(new ValidationError({ message: "Username must be at least 3 characters." }));
  }

  if (password.length < 8) {
    return Effect.fail(new ValidationError({ message: "Password must be at least 8 characters." }));
  }

  return Effect.void;
};

const newSessionToken = (): string => randomBytes(32).toString("base64url");

export class Auth extends Effect.Service<Auth>()("Auth", {
  effect: Effect.gen(function* () {
    const database = yield* Database;
    const passwords = yield* PasswordHasher;

    const createSession = (user: User): Effect.Effect<Session, DatabaseError> =>
      Effect.gen(function* () {
        const token = newSessionToken();
        yield* database.createSession(token, user.id);
        return { user, token };
      });

    const register = (username: string, password: string): Effect.Effect<Session, AppError> =>
      Effect.gen(function* () {
        const name = username.trim();
        yield* validate(name, password);
        const passwordHash = yield* passwords.hash(password);
        const user = yield* database.createUser(name, passwordHash);
        return yield* createSession(user);
      });

    const login = (
      username: string,
      password: string
    ): Effect.Effect<Session, InvalidCredentials | DatabaseError | CryptoError> =>
      Effect.gen(function* () {
        const user = yield* database.findUserByUsername(username.trim());

        if (!user) {
          return yield* Effect.fail(
            new InvalidCredentials({ message: "Invalid username or password." })
          );
        }

        const valid = yield* passwords.verify(password, user.password_hash);

        if (!valid) {
          return yield* Effect.fail(
            new InvalidCredentials({ message: "Invalid username or password." })
          );
        }

        return yield* createSession({ id: user.id, username: user.username });
      });

    const currentUser = (token: string): Effect.Effect<User | null, DatabaseError> =>
      database.findUserBySession(token);

    const logout = (token: string): Effect.Effect<void, DatabaseError> =>
      database.deleteSession(token);

    return { register, login, currentUser, logout };
  })
}) {}
