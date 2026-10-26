import { Schema } from "effect";

export const Username = Schema.Trim.pipe(
  Schema.minLength(3, { message: () => "Username must be at least 3 characters." }),
  Schema.maxLength(32, { message: () => "Username must be at most 32 characters." }),
  Schema.brand("Username")
);
export type Username = Schema.Schema.Type<typeof Username>;

export const LoginUsername = Schema.Trim.pipe(
  Schema.minLength(1, { message: () => "Username is required." }),
  Schema.maxLength(32, { message: () => "Username must be at most 32 characters." }),
  Schema.brand("Username")
);
export type LoginUsername = Schema.Schema.Type<typeof LoginUsername>;

export const Password = Schema.String.pipe(
  Schema.minLength(8, { message: () => "Password must be at least 8 characters." }),
  Schema.maxLength(128, { message: () => "Password must be at most 128 characters." }),
  Schema.brand("Password")
);
export type Password = Schema.Schema.Type<typeof Password>;

export const LoginPassword = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Password is required." }),
  Schema.maxLength(128, { message: () => "Password must be at most 128 characters." }),
  Schema.brand("LoginPassword")
);
export type LoginPassword = Schema.Schema.Type<typeof LoginPassword>;

export const HashedPassword = Schema.String.pipe(Schema.brand("HashedPassword"));
export type HashedPassword = Schema.Schema.Type<typeof HashedPassword>;

export const UserId = Schema.Int.pipe(Schema.brand("UserId"));
export type UserId = Schema.Schema.Type<typeof UserId>;

export const SessionToken = Schema.String.pipe(
  Schema.minLength(1),
  Schema.brand("SessionToken")
);
export type SessionToken = Schema.Schema.Type<typeof SessionToken>;

export const RegisterCredentials = Schema.Struct({
  username: Username,
  password: Password
});
export type RegisterCredentials = Schema.Schema.Type<typeof RegisterCredentials>;

export const LoginCredentials = Schema.Struct({
  username: LoginUsername,
  password: LoginPassword
});
export type LoginCredentials = Schema.Schema.Type<typeof LoginCredentials>;
