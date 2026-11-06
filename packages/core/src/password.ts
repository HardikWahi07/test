import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  cost = COST,
  blockSize = BLOCK_SIZE,
  parallelization = PARALLELIZATION,
) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: 64 * 1024 * 1024,
      },
      (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !saltHex ||
    !keyHex
  ) {
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const costValue = Number(cost);
  const blockSizeValue = Number(blockSize);
  const parallelizationValue = Number(parallelization);
  if (
    !Number.isSafeInteger(costValue) ||
    costValue < 16384 ||
    costValue > 131072 ||
    !Number.isSafeInteger(blockSizeValue) ||
    blockSizeValue < 1 ||
    blockSizeValue > 16 ||
    !Number.isSafeInteger(parallelizationValue) ||
    parallelizationValue < 1 ||
    parallelizationValue > 4 ||
    expected.length !== KEY_LENGTH ||
    Buffer.from(saltHex, "hex").length !== 16
  ) {
    return false;
  }
  const actual = await deriveKey(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
    costValue,
    blockSizeValue,
    parallelizationValue,
  );
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
