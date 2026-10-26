const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character] ?? character
  );

const layout = (title: string, content: string): string => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        max-width: 42rem;
        margin: 3rem auto;
        padding: 0 1rem;
        font-family: system-ui, sans-serif;
        line-height: 1.5;
        color: #1f2933;
      }
      nav a { margin-right: 1rem; }
      form {
        border: 1px solid #d9e2ec;
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
      }
      label { display: block; margin-top: 0.75rem; font-weight: 600; }
      input {
        box-sizing: border-box;
        width: 100%;
        margin-top: 0.25rem;
        padding: 0.5rem;
      }
      button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
      }
      .error { color: #b00020; }
    </style>
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/login">Login</a>
      <a href="/secret">Secret</a>
    </nav>
    ${content}
  </body>
</html>`;

export const homePage = (): string =>
  layout(
    "Home",
    `<h1>Home Sweet Home!</h1>
     <p>This is the public page. Try opening the secret page without logging in.</p>`
  );

export const loginPage = (error?: string): string =>
  layout(
    "Login",
    `<h1>Login</h1>
     ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
     <form method="post" action="/login">
       <h2>Log in</h2>
       <label for="login-username">Username</label>
       <input id="login-username" name="username" autocomplete="username" required>
       <label for="login-password">Password</label>
       <input id="login-password" name="password" type="password" autocomplete="current-password" required>
       <button type="submit">Log in</button>
     </form>
     <form method="post" action="/register">
       <h2>Register</h2>
       <label for="register-username">Username</label>
       <input id="register-username" name="username" autocomplete="username" required>
       <label for="register-password">Password</label>
       <input id="register-password" name="password" type="password" autocomplete="new-password" required>
       <button type="submit">Create account</button>
     </form>`
  );

export const secretPage = (username: string): string =>
  layout(
    "Secret",
    `<h1>TOP SECRET</h1>
     <p>Welcome, <strong>${escapeHtml(username)}</strong>. Only authenticated users can see this page.</p>
     <form method="post" action="/logout">
       <button type="submit">Log off</button>
     </form>`
  );

export const errorPage = (message: string): string =>
  layout(
    "Error",
    `<h1>Something went wrong</h1>
     <p class="error">${escapeHtml(message)}</p>
     <p><a href="/login">Back to login</a></p>`
  );
