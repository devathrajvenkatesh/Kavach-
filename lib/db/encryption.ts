import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

/**
 * Derives a 32-byte encryption key from environment secret or server fallback.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.TOKEN_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "kavach-production-encryption-salt-2026-default-fallback-key";

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive string (e.g. OAuth refresh token) using AES-256-GCM.
 * Output format: "enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return `enc:v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch {
    // Fail closed: never return unencrypted data
    throw new Error("Encryption failed. Sensitive credential could not be secured.");
  }
}

/**
 * Decrypts an AES-256-GCM encrypted token string.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
      throw new Error("Invalid encrypted token format");
    }

    const iv = Buffer.from(parts[2], "hex");
    const tag = Buffer.from(parts[3], "hex");
    const ciphertext = Buffer.from(parts[4], "hex");

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    throw new Error("Decryption failed. Token could not be authenticated.");
  }
}
