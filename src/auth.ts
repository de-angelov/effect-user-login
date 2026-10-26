import { Effect, Option } from "effect";
import { randomBytes } from "node:crypto";

import { CurrentUser, Database } from "./database.js";
import {
  LoginCredentials,
  RegisterCredentials,
  SessionToken
} from "./domain.js";
import {
  type AppError,
  type CryptoError,
  type DatabaseError,
  InvalidCredentials
} from "./errors.js";
import { PasswordHasher } from "./password.js";

export interface Session {
  readonly user: CurrentUser;
  readonly token: SessionToken;
}

const newSessionToken = (): SessionToken =>
  SessionToken.make(randomBytes(32).toString("base64url"));

export class Auth extends Effect.Service<Auth>()("Auth", {
  accessors: true,
  effect: Effect.gen(function* () {
    const database = yield* Database;
    const passwords = yield* PasswordHasher;

    const createSession = Effect.fn("Auth.createSession")(
      function* (user: CurrentUser): Effect.fn.Return<Session, DatabaseError> {
        const token = newSessionToken();
        yield* database.createSession(token, user.id);
        return { user, token };
      }
    );

    const register = Effect.fn("Auth.register")(
      function* (
        credentials: RegisterCredentials
      ): Effect.fn.Return<Session, AppError> {
        const passwordHash = yield* passwords.hash(credentials.password);
        const user = yield* database.createUser(
          credentials.username,
          passwordHash
        );

        return yield* createSession({
          id: user.id,
          username: user.username
        });
      }
    );

    const login = Effect.fn("Auth.login")(
      function* (
        credentials: LoginCredentials
      ): Effect.fn.Return<
        Session,
        InvalidCredentials | DatabaseError | CryptoError
      > {
        const maybeUser = yield* database.findUserByUsername(
          credentials.username
        );

        if (Option.isNone(maybeUser)) {
          return yield* new InvalidCredentials({
            message: "Invalid username or password."
          });
        }

        const user = maybeUser.value;
        const valid = yield* passwords.verify(
          credentials.password,
          user.passwordHash
        );

        if (!valid) {
          return yield* new InvalidCredentials({
            message: "Invalid username or password."
          });
        }

        return yield* createSession({
          id: user.id,
          username: user.username
        });
      }
    );

    const currentUser = Effect.fn("Auth.currentUser")(
      function* (
        token: SessionToken
      ): Effect.fn.Return<Option.Option<CurrentUser>, DatabaseError> {
        return yield* database.findUserBySession(token);
      }
    );

    const logout = Effect.fn("Auth.logout")(
      function* (token: SessionToken): Effect.fn.Return<void, DatabaseError> {
        yield* database.deleteSession(token);
      }
    );

    return { register, login, currentUser, logout };
  }),
  dependencies: [Database.Default, PasswordHasher.Default]
}) {}
