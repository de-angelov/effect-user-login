# Effect User Login

A small server-rendered login app built with TypeScript and [Effect](https://effect.website/).

It is the TypeScript counterpart to the
[Scala/ZIO](https://github.com/de-angelov/scala-user-login) and
[Haskell/Servant](https://github.com/de-angelov/servant-user-login) examples:
the same small application, implemented with a different effect system and web stack.

## What it includes

- Server-rendered HTML pages
- Registration and login forms
- Session cookies backed by PostgreSQL
- A protected `/secret` route
- Password hashing with Node's `scrypt`
- Effect services and layers for the database, password hashing, and auth logic

## Stack

- **TypeScript** — typed JavaScript
- **Effect** — typed effects, dependency injection through layers, and error handling
- **@effect/platform** — HTTP server and router
- **@effect/sql-pg** — PostgreSQL client for Effect SQL
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

## Notes

This is a small comparison example, not a production auth system. It keeps the
session model deliberately simple and does not include CSRF protection, rate
limiting, or password reset flows.

The `.npmrc` file omits optional native dependencies (such as file watchers)
that this example does not use, which keeps installation small and avoids
platform-specific downloads.
