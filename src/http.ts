import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform";
import type { RequestError } from "@effect/platform/HttpServerError";
import { Effect, Option, ParseResult, Schema } from "effect";

import { Auth } from "./auth.js";
import {
  LoginCredentials,
  RegisterCredentials,
  SessionToken
} from "./domain.js";
import { type AppError, ValidationError } from "./errors.js";
import { errorPage, homePage, loginPage, secretPage } from "./pages.js";

const htmlResponse = (body: string): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(body, { contentType: "text/html; charset=utf-8" });

const FormFields = Schema.Struct({
  username: Schema.optional(Schema.String),
  password: Schema.optional(Schema.String)
});

const formFields = HttpServerRequest.schemaBodyUrlParams(FormFields);

const toValidationError = (
  error: ParseResult.ParseError | RequestError
): ValidationError => {
  if (error._tag === "ParseError") {
    const issue = ParseResult.ArrayFormatter.formatErrorSync(error)[0];
    return new ValidationError({
      message: issue?.message ?? "Invalid form submission."
    });
  }

  return new ValidationError({ message: "Invalid form submission." });
};

const parseCredentials = <A>(
  schema: Schema.Schema<
    A,
    { readonly username: string; readonly password: string }
  >
): Effect.Effect<A, ValidationError, HttpServerRequest.HttpServerRequest> =>
  formFields.pipe(
    Effect.flatMap((form) =>
      Schema.decodeUnknown(schema)({
        username: form.username ?? "",
        password: form.password ?? ""
      })
    ),
    Effect.mapError(toValidationError)
  );

const registerCredentials = parseCredentials(RegisterCredentials);
const loginCredentials = parseCredentials(LoginCredentials);

const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: "7 days" as const
};

const withSession = (location: string, token: SessionToken) =>
  HttpServerResponse.setCookie(
    HttpServerResponse.redirect(location, { status: 303 }),
    "session",
    token,
    sessionCookie
  ).pipe(Effect.orDie);

const sessionToken = (
  request: HttpServerRequest.HttpServerRequest
): Option.Option<SessionToken> => {
  const token = request.cookies.session;
  return token
    ? Schema.decodeUnknownOption(SessionToken)(token)
    : Option.none();
};

const handleAppError = <R>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, AppError, R>
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  effect.pipe(
    Effect.catchTags({
      ValidationError: (error) =>
        Effect.succeed(
          HttpServerResponse.setStatus(
            htmlResponse(loginPage(error.message)),
            400
          )
        ),
      UsernameTaken: () =>
        Effect.succeed(
          HttpServerResponse.setStatus(
            htmlResponse(loginPage("That username is already taken.")),
            409
          )
        ),
      InvalidCredentials: () =>
        Effect.succeed(
          HttpServerResponse.setStatus(
            htmlResponse(loginPage("Invalid username or password.")),
            401
          )
        ),
      DatabaseError: () =>
        Effect.succeed(
          HttpServerResponse.setStatus(
            htmlResponse(errorPage("Unexpected server error.")),
            500
          )
        ),
      CryptoError: () =>
        Effect.succeed(
          HttpServerResponse.setStatus(
            htmlResponse(errorPage("Unexpected server error.")),
            500
          )
        )
    })
  );

const register = Effect.fn("http.register")(function* () {
  const form = yield* registerCredentials;
  const session = yield* Auth.register(form);
  return yield* withSession("/secret", session.token);
});

const login = Effect.fn("http.login")(function* () {
  const form = yield* loginCredentials;
  const session = yield* Auth.login(form);
  return yield* withSession("/secret", session.token);
});

const logout = Effect.fn("http.logout")(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const token = sessionToken(request);

  if (Option.isSome(token)) {
    yield* Auth.logout(token.value).pipe(
      Effect.catchTag("DatabaseError", (error) =>
        Effect.logWarning("Could not delete the session", error)
      )
    );
  }

  return HttpServerResponse.expireCookie(
    HttpServerResponse.redirect("/login", { status: 303 }),
    "session",
    { path: "/" }
  );
});

const secret = Effect.fn("http.secret")(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const token = sessionToken(request);

  if (Option.isNone(token)) {
    return HttpServerResponse.redirect("/login", { status: 303 });
  }

  const user = yield* Auth.currentUser(token.value);

  if (Option.isNone(user)) {
    return HttpServerResponse.redirect("/login", { status: 303 });
  }

  return htmlResponse(secretPage(user.value.username));
});

export const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", htmlResponse(homePage())),
  HttpRouter.get("/login", htmlResponse(loginPage())),
  HttpRouter.post("/register", handleAppError(register())),
  HttpRouter.post("/login", handleAppError(login())),
  HttpRouter.post("/logout", logout()),
  HttpRouter.get("/secret", handleAppError(secret()))
);
