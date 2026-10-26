# Effect User Login

A small server-rendered login app built with TypeScript and [Effect](https://effect.website/).

It is the TypeScript counterpart to the
[Scala/ZIO](https://github.com/de-angelov/scala-user-login) and
[Haskell/Servant](https://github.com/de-angelov/servant-user-login) examples:
the same small application, implemented with a different effect system and web stack.

## What it includes

- Server-rendered HTML pages with type-safe JSX templates
- Registration and login forms
- Schema-validated input with branded domain types
- Session cookies backed by PostgreSQL
- A protected `/secret` route
- Password hashing with Node's `scrypt`
- Effect services, layers, and typed SQL queries

## Stack

- **TypeScript** — typed JavaScript
- **Effect** — typed effects, dependency injection through layers, `Schema`, and error handling
- **@effect/platform** — HTTP server and router
- **@effect/sql** — typed SQL queries with `Model` and `SqlSchema`
- **@effect/sql-pg** — PostgreSQL driver for Effect SQL
- **@kitajs/html** — type-safe JSX templates that render to HTML strings
- **PostgreSQL** — users and sessions

## Run it

```bash
npm install
docker compose up -d --wait db
npm run build
npm start
```

Open <http://localhost:3000>.

For development, run the TypeScript compiler in watch mode in one terminal:

```bash
npm run dev
```

and restart the server after a successful build:

```bash
npm start
```

## Configuration

| Variable       | Default                                                    |
| -------------- | ---------------------------------------------------------- |
| `PORT`         | `3000`                                                     |
| `HOST`         | `127.0.0.1`                                                |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/effect_login` |

## Routes

| Route            | Description                              |
| ---------------- | ---------------------------------------- |
| `GET /`          | Public home page                         |
| `GET /login`     | Login and registration forms             |
| `POST /login`    | Authenticate and set a session cookie    |
| `POST /register` | Create a user and set a session cookie   |
| `POST /logout`   | Delete the session and clear the cookie  |
| `GET /secret`    | Protected page; redirects when logged out |

## Templates

Pages live in `src/pages.tsx` and use `@kitajs/html` JSX. User-controlled text
is rendered with the `safe` attribute, which makes `@kitajs/html` HTML-escape
it. Trusted layout markup and CSS are emitted as-is.

## Effect patterns

- `src/config.ts` reads `PORT`, `HOST`, and `DATABASE_URL` with `Config`; the HTTP and SQL layers consume those configs directly.
- `src/domain.ts` defines branded `Schema` types for usernames, passwords, session tokens, and credentials. Validation happens once at the HTTP boundary and the rest of the app uses the branded types.
- `src/database.ts` models a user row with `Model.Class` and uses `SqlSchema` for typed queries. Lookups return `Option`, and unique violations are mapped to a domain error.
- `src/auth.ts` exposes `Auth` as an `Effect.Service` with accessors and self-contained dependencies. Its operations are wrapped in `Effect.fn` for named traces.
- `src/http.ts` keeps route handlers as effects and maps domain errors to HTTP responses with `Effect.catchTags`.
- `src/main.ts` only composes the server layer and launches it. Configuration and dependencies are supplied by layers.

## Notes

This is a small comparison example, not a production auth system. It keeps the
session model deliberately simple and does not include CSRF protection, rate
limiting, or password reset flows.

The `.npmrc` file omits optional native dependencies (such as file watchers)
that this example does not use, which keeps installation small and avoids
platform-specific downloads.
