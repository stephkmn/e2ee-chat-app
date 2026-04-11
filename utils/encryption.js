const { gcm } = require("@noble/ciphers/aes.js");
const Crypto = require("expo-crypto");

const KEY_LENGTH_BYTES = 32; // 256 bits
const NONCE_LENGTH_BYTES = 12; // AES-GCM recommended 96-bit nonce

function getTextEncoder() {
    if (typeof TextEncoder !== "undefined") return new TextEncoder();
    throw new Error("TextEncoder is not available in this environment");
}

function getTextDecoder() {
    if (typeof TextDecoder !== "undefined") return new TextDecoder();
    throw new Error("TextDecoder is not available in this environment");
}

function bytesToHex(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
        out += bytes[i].toString(16).padStart(2, "0");
    }
    return out;
}

function hexToBytes(hex) {
    if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new Error("Invalid hex string");
    }
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

function bytesToBase64(bytes) {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    // Browser/RN fallback
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    // eslint-disable-next-line no-undef
    return btoa(binary);
}

function base64ToBytes(base64) {
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(base64, "base64"));
    }
    // eslint-disable-next-line no-undef
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < out.length; i++) out[i] = binary.charCodeAt(i);
    return out;
}

function randomBytes(length) {
    if (Crypto && typeof Crypto.getRandomBytes === "function") {
        return Crypto.getRandomBytes(length);
    }

    if (
        typeof globalThis !== "undefined" &&
        globalThis.crypto &&
        typeof globalThis.crypto.getRandomValues === "function"
    ) {
        const out = new Uint8Array(length);
        globalThis.crypto.getRandomValues(out);
        return out;
    }

    throw new Error("Secure random values are not available in this environment");
}

function parseKeyMaterial(encoded, expectedBytes) {
    if (typeof encoded !== "string" || encoded.length === 0) {
        throw new Error("Key/Nonce must be a non-empty string");
    }

    const expectedHexLen = expectedBytes * 2;
    const looksHex = encoded.length === expectedHexLen && /^[0-9a-fA-F]+$/.test(encoded);
    const bytes = looksHex ? hexToBytes(encoded) : base64ToBytes(encoded);

    if (bytes.length !== expectedBytes) {
        throw new Error(`Invalid key/nonce length (expected ${expectedBytes} bytes)`);
    }
    return bytes;
}

/**
 * Generates a random 256-bit (32-byte) AES key.
 * @param {{ encoding?: 'base64' | 'hex' }} [options]
 * @returns {string} Encoded key string.
 */
function generateKey(options = {}) {
    const { encoding = "base64" } = options;
    const keyBytes = randomBytes(KEY_LENGTH_BYTES);
    return encoding === "hex" ? bytesToHex(keyBytes) : bytesToBase64(keyBytes);
}

/**
 * Encrypts a message using AES-256-GCM.
 * @param {string} text Plaintext (non-empty).
 * @param {string} key AES key (base64 by default, or hex).
 * @returns {{ ciphertext: string, nonce: string }} ciphertext base64, nonce(base64 nonce).
 */
function encryptMessage(text, key) {
    if (typeof text !== "string" || text.length === 0) {
        throw new Error("Text must be a non-empty string");
    }

    const keyBytes = parseKeyMaterial(key, KEY_LENGTH_BYTES);
    const nonceBytes = randomBytes(NONCE_LENGTH_BYTES);

    const aes = gcm(keyBytes, nonceBytes);
    const plaintextBytes = getTextEncoder().encode(text);
    const ciphertextBytes = aes.encrypt(plaintextBytes); // includes auth tag internally

    return {
        ciphertext: bytesToBase64(ciphertextBytes),
        nonce: bytesToBase64(nonceBytes),
    };
}

/**
 * Decrypts a message produced by encryptMessage.
 * @param {string} ciphertext Base64 ciphertext (includes auth tag).
 * @param {string} key AES key (base64 by default, or hex).
 * @param {string} nonce Base64 nonce (or hex when provided as hex-encoded bytes).
 * @returns {string|null} Decrypted UTF-8 plaintext, or null if authentication fails.
 */
function decryptMessage(ciphertext, key, nonce) {
    try {
        if (typeof ciphertext !== "string" || ciphertext.length === 0) {
            throw new Error("Ciphertext must be a non-empty string");
        }

        const keyBytes = parseKeyMaterial(key, KEY_LENGTH_BYTES);
        const nonceBytes = parseKeyMaterial(nonce, NONCE_LENGTH_BYTES);
        const ciphertextBytes = base64ToBytes(ciphertext);

        const aes = gcm(keyBytes, nonceBytes);
        const plaintextBytes = aes.decrypt(ciphertextBytes);
        const plaintext = getTextDecoder().decode(plaintextBytes);

        return plaintext.length > 0 ? plaintext : null;
    } catch (e) {
        // For GCM, wrong key or tampering should fail authentication and end up here.
        return null;
    }
}

// Run this file directly to execute tests:
// node utils/encryption.js
if (require.main === module) {
    console.log("--- Starting Encryption Unit Tests (AES-256-GCM) ---\n");

    try {
        const key = generateKey(); // base64 by default
        console.log(`[PASS] generateKey() returned (base64). Length: ${key.length}`);

        const originalMessage = "Secret message muhehehehe >:3";
        const encryptedData = encryptMessage(originalMessage, key);
        console.log("[PASS] encryptMessage() executed");

        const decryptedMessage = decryptMessage(
            encryptedData.ciphertext,
            key,
            encryptedData.nonce
        );

        if (decryptedMessage === originalMessage) {
            console.log(`\nOriginal message: ${originalMessage}`);
            console.log(`Decrypted message: ${decryptedMessage}`);
            console.log("SUCCESS: Decrypted message matches original!");
        } else {
            console.log("FAILURE: Decrypted message does not match original.");
            console.log(`Expected: ${originalMessage}`);
            console.log(`Got: ${decryptedMessage}`);
        }

        console.log("\n--- Testing Invalid Key ---");
        const wrongKey = generateKey();
        const badDecrypt = decryptMessage(
            encryptedData.ciphertext,
            wrongKey,
            encryptedData.nonce
        );

        if (badDecrypt === null) {
            console.log("SUCCESS: Wrong key failed authentication (null).");
        } else {
            console.log("FAILURE: Wrong key unexpectedly produced plaintext.");
            console.log(`Output: ${badDecrypt}`);
        }
    } catch (error) {
        console.error("TEST FAILED WITH ERROR:", error.message);
        process.exitCode = 1;
    }
}

module.exports = {
    generateKey,
    encryptMessage,
    decryptMessage,
};
