import { constants, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, ".env.example");
const destination = resolve(root, ".env");

try {
  copyFileSync(example, destination, constants.COPYFILE_EXCL);
  console.log("Created .env from .env.example. Existing .env files are never overwritten.");
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
    console.log(".env already exists; leaving it unchanged.");
  } else {
    throw error;
  }
}
