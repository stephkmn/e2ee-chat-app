# 🚀 SecureChat Project Brief (QR Code E2EE Model)

## 1. Project Goal
Build a mobile chat application where messages are encrypted **before** leaving the device. The server (Firebase) stores only ciphertext and cannot read user messages. Users must physically scan a QR code to "pair" devices, ensuring secure key exchange without internet interception.

---

## 2. Tech Stack

| Tool | Purpose | Analogy |
| :--- | :--- | :--- |
| **Expo (React Native)** | Mobile App Framework | The **Phone** itself |
| **Firebase** | Auth & Database (Firestore) | The **Post Office** (delivers locked boxes) |
| **expo-secure-store** | Secure Key Storage | The **Safe** (keys never leave the phone) |
| **expo-crypto** | Random Key Generation | The **Key Maker** (creates secure random keys) |
| **crypto-js** | AES Encryption/Decryption | The **Lock** (locks/unlocks message content) |
| **expo-barcode-scanner** | QR Scanning | The **Scanner** (reads the key from partner) |
| **react-native-qrcode-svg** | QR Display | The **Display** (shows key to partner) |

---

## 3. Encryption Workflow (3 Steps)

### Step 1: Pairing (The QR Handshake)
1. **Alice** opens the app and clicks **"Create Chat"**.
2. Her phone generates a random **AES Secret Key** (256-bit) using `expo-crypto`.
3. Her phone displays this key as a **QR Code**.
4. **Bob** opens the app, clicks **"Join Chat"**, and scans Alice's QR code.
5. Bob's phone now has the same **AES Secret Key**.
6. ✅ Both phones save this key locally in `expo-secure-store` associated with the Chat ID.

### Step 2: Sending a Message (Locking)
1. Alice types "Hello".
2. Her app retrieves the **AES Secret Key** from secure storage.
3. Her app uses `@noble/ciphers` to **encrypt** the message with the key.
4. The locked message (ciphertext) is sent to Firebase Firestore.
5. **Firebase sees:** `U2FsdGVkX1+ABC123...` (Gibberish)
6. **Firebase cannot read:** "Hello"

### Step 3: Receiving a Message (Unlocking)
1. Bob's app listens for new messages in Firestore.
2. His app downloads the locked message.
3. His app retrieves the **AES Secret Key** from secure storage.
4. His app uses `@noble/ciphers` to **decrypt** the message.
5. Bob sees: "Hello"

---

## 4. Security Model (Who Sees What?)

| Data | Alice's Phone | Bob's Phone | Firebase Server | Hacker (Network) |
| :--- | :---: | :---: | :---: | :---: |
| **AES Secret Key** | ✅ Yes | ✅ Yes | ❌ **No** | ❌ **No** |
| **Messages** | ✅ Yes (Decrypted) | ✅ Yes (Decrypted) | ❌ **No (Encrypted)** | ❌ **No** |
| **QR Code** | ✅ Generates it | ✅ Scans it | ❌ **Never sees it** | ❌ **Only if physically watching** |

---

## 5. Team Responsibilities

### 🎨 Frontend Team
- Build Chat UI, Login, and Pairing screens.
- Implement QR display (`react-native-qrcode-svg`).
- Implement QR scanning (`expo-barcode-scanner`).
- Ensure smooth navigation between screens.

### 🗄️ Backend Team
- Set up Firebase Auth (Email/Password).
- Set up Firestore Database structure (`chats/{chatId}/messages`).
- Write **Security Rules**: Users can only read/write to chats they are paired in.
- Manage `.env` configuration for Firebase keys.

### 🛡️ Security Team
- Generate AES keys using `expo-crypto.getRandomBytesAsync(32)`.
- Implement Encrypt/Decrypt utility functions using `crypto-js`.
- Ensure keys are stored in `expo-secure-store` (never in plain JS variables).
- Audit code to ensure no keys are logged to the console.

---

## 6. Pros & Cons of This Approach

| ✅ Pros | ❌ Cons |
| :--- | :--- |
| **Simple to implement** (No complex math like DH) | **Users must meet physically** to pair |
| **Strong security** (No MITM risk during pairing) | **Hard to add new devices** (key is tied to one phone) |
| **Great for demos** (Visual "hacker-proof" moment) | **No group chat support** (without complex key management) |

---

## 7. Critical Implementation Rules

1.  **Key Generation:** Use `expo-crypto.getRandomBytesAsync(32)` for 256-bit keys. **NEVER** use `Math.random()`.
2.  **Key Storage:** Save the AES key to `expo-secure-store` immediately. Do not leave it in global state longer than necessary.
3.  **Encryption Flow:** Encrypt **before** `addDoc()` to Firestore. Decrypt **after** `onSnapshot()` receives data.
4.  **No Logging:** Never `console.log()` the key or the decrypted message in production builds.
5.  **Environment Variables:** Store Firebase config in `.env` with `EXPO_PUBLIC_` prefix. Never commit `.env` to GitHub.

---

## 8. Installation Commands

Run these commands in your project root:

```bash
# 1. Install Core Dependencies
npm install firebase crypto-js

# 2. Install Expo Modules (Use npx expo install for compatibility)
npx expo install expo-secure-store expo-crypto expo-barcode-scanner

# 3. Install QR Code Libraries
npm install react-native-qrcode-svg
npm install react-native-svg
