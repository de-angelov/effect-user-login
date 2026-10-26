import { Effect } from "effect";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { HashedPassword, Password } from "./domain.js";
import { CryptoError } from "./errors.js";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

const hash = Effect.fn("PasswordHasher.hash")((password: Password) =>
  Effect.tryPromise({
    try: async () => {
      const salt = randomBytes(16).toString("hex");
      const derived = (await scrypt(password, salt, keyLength)) as Buffer;
      return HashedPassword.make(`${salt}:${derived.toString("hex")}`);
    },
    catch: (cause) =>
      new CryptoError({ message: "Could not hash the password.", cause })
  })
);

const verify = Effect.fn("PasswordHasher.verify")(
  (password: string, stored: HashedPassword) =>
    Effect.tryPromise({
      try: async () => {
        const [salt, key] = stored.split(":");
        if (!salt || !key) {
          return false;
        }

        const derived = (await scrypt(password, salt, keyLength)) as Buffer;
        const expected = Buffer.from(key, "hex");

        return (
          expected.length === derived.length &&
          timingSafeEqual(expected, derived)
        );
      },
      catch: (cause) =>
        new CryptoError({ message: "Could not verify the password.", cause })
    })
);

export class PasswordHasher extends Effect.Service<PasswordHasher>()("PasswordHasher", {
  succeed: { hash, verify }
}) {}
