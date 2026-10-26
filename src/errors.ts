import { Data } from "effect";

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
}> {}

export class UsernameTaken extends Data.TaggedError("UsernameTaken")<{
  readonly message: string;
}> {}

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<{
  readonly message: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class CryptoError extends Data.TaggedError("CryptoError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export type AppError =
  | ValidationError
  | UsernameTaken
  | InvalidCredentials
  | DatabaseError
  | CryptoError;
