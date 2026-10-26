import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse
} from "@effect/platform";
import { Effect, Schema } from "effect";

import { Auth } from "./auth.js";
import { ValidationError, type AppError } from "./errors.js";
import { errorPage, homePage, loginPage, secretPage } from "./pages.js";

const Credentials = Schema.Struct({
  username: Schema.String,
  password: Schema.String
});

const sessionCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: "7 days" as const
};

const withSession = (location: string, token: string) =>
  HttpServerResponse.setCookie(
    HttpServerResponse.redirect(location, { status: 303 }),
    "session",
    token,
    sessionCookie
  ).pipe(Effect.orDie);

const errorResponse = (error: unknown): HttpServerResponse.HttpServerResponse => {
  const tag = (error as { readonly _tag?: string })._tag;

  switch (tag) {
    case "ValidationError":
      return HttpServerResponse.setStatus(
        HttpServerResponse.html(loginPage((error as ValidationError).message)),
        400
      );
    case "UsernameTaken":
      return HttpServerResponse.setStatus(
        HttpServerResponse.html(loginPage("That username is already taken.")),
        409
      );
    case "InvalidCredentials":
      return HttpServerResponse.setStatus(
        HttpServerResponse.html(loginPage("Invalid username or password.")),
        401
      );
    default:
      return HttpServerResponse.setStatus(
        HttpServerResponse.html(errorPage("Unexpected server error.")),
        500
      );
  }
};

const credentials = HttpServerRequest.schemaBodyUrlParams(Credentials).pipe(
  Effect.mapError(
    () => new ValidationError({ message: "Username and password are required." })
  )
);

export const createRouter = (auth: Auth) => {
  const register = Effect.gen(function* () {
    const form = yield* credentials;
    const session = yield* auth.register(form.username, form.password);
    return yield* withSession("/secret", session.token);
  }).pipe(Effect.catchAll((error) => Effect.succeed(errorResponse(error))));

  const login = Effect.gen(function* () {
    const form = yield* credentials;
    const session = yield* auth.login(form.username, form.password);
    return yield* withSession("/secret", session.token);
  }).pipe(Effect.catchAll((error) => Effect.succeed(errorResponse(error))));

  const logout = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const token = request.cookies.session;

    if (token) {
      yield* auth.logout(token).pipe(Effect.catchAll(() => Effect.void));
    }

    return HttpServerResponse.expireCookie(
      HttpServerResponse.redirect("/login", { status: 303 }),
      "session",
      { path: "/" }
    );
  });

  const secret = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const token = request.cookies.session;

    if (!token) {
      return HttpServerResponse.redirect("/login", { status: 303 });
    }

    const user = yield* auth.currentUser(token);

    if (!user) {
      return HttpServerResponse.redirect("/login", { status: 303 });
    }

    return HttpServerResponse.html(secretPage(user.username));
  }).pipe(Effect.catchAll((error) => Effect.succeed(errorResponse(error))));

  return HttpRouter.empty.pipe(
    HttpRouter.get("/", HttpServerResponse.html(homePage())),
    HttpRouter.get("/login", HttpServerResponse.html(loginPage())),
    HttpRouter.post("/register", register),
    HttpRouter.post("/login", login),
    HttpRouter.post("/logout", logout),
    HttpRouter.get("/secret", secret)
  );
};
