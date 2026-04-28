# E2EE Chat App

A mobile messaging app where every message is encrypted on the sender's device before it ever touches the network. The backend stores only ciphertext — even a full database leak would not expose message contents.

## Highlights

- **End-to-end encryption.** Messages are encrypted with a shared symmetric key before being written to Firestore. The server never sees plaintext.
- **QR code key exchange.** Two devices establish a shared secret by scanning a QR code in person, so the key never traverses the network.
- **Hardware-backed key storage.** Per-chat keys are kept in `expo-secure-store`, which is encrypted at rest on the device.
- **Authenticated access.** Firebase Auth gates every read and write; Firestore security rules enforce per-chat access control.
- **Real-time delivery.** Firestore listeners stream new ciphertext to each participant and decrypt it on arrival.
- **Cross-platform.** Runs on iOS and Android from a single Expo/React Native codebase.

## Overview

The app is built with **React Native (Expo)** and uses **Firebase** for authentication, real-time message transport, and persistence. All cryptographic work happens on-device:

- **Encryption:** symmetric encryption via `@noble/ciphers` with a random nonce per message, so identical plaintexts always produce distinct ciphertexts.
- **Key exchange:** the initiator generates a shared key and encodes it, along with the chat ID, into a QR code. The recipient scans the code with `expo-camera` and both devices persist the same key locally.
- **Storage:** keys live in `expo-secure-store`; chat metadata and ciphertext live in Firestore.
- **Sessions:** Firebase Auth handles account creation and login; React Navigation drives the screen flow (Login → Chats → QR handshake → Chat).

### Project structure

```
App.js               # Navigation root
screens/             # Login, Register, ChatList, Chat, QR generator, QR scanner
services/            # Firebase config + auth helpers + chat/message APIs
utils/               # Encryption primitives and secure-storage helpers
context/             # Chat state provider shared across screens
firestore.rules      # Server-side access control
```

### Known limitations

This is an educational implementation. It intentionally uses a straightforward shared-secret model rather than a production protocol such as Signal's Double Ratchet, so it does not provide forward secrecy or post-compromise security. Message metadata (participants and timestamps) remains visible to the server.

## Authors

- Stephanie Noe
- Nathan Fender
- Jordan Flores
- Aranzazu Romero
- Joshua Trinh
- Taehyeon Park

## Demo video (YouTube redirect)
<p>
  <a href="https://youtu.be/zJv4kbviCQg">
    <img src="https://img.youtube.com/vi/zJv4kbviCQg/0.jpg" alt="E2EE Chat Demo" />
  </a>
</p>

## Running the app

### Prerequisites

- [Node.js](https://nodejs.org/) LTS (v18 or v20)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) installed on a physical iOS or Android device
- A Firebase project with Authentication (Email/Password) and Firestore enabled

### 1. Clone and install

```bash
git clone https://github.com/stephkmn/e2ee-chat-app.git
cd e2ee-chat-app
npm install
```

### 2. Configure Firebase

Create a `.env` file at the project root with the credentials from your Firebase web app config:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Then deploy the security rules so unauthenticated clients can't read or write chats:

```bash
npx firebase deploy --only firestore:rules
```

### 3. Start the dev server

```bash
npx expo start
```

A QR code will appear in the terminal. Open Expo Go on your phone and scan it — the Camera app works on iOS, and Expo Go's built-in scanner works on Android. Both devices must be on the same Wi-Fi network as the machine running the dev server.

### 4. Try it with two devices

1. Register an account on each device.
2. On device A, start a new chat and share the generated QR code.
3. On device B, scan the code to complete the handshake.
4. Send a message — it is encrypted locally, stored as ciphertext in Firestore, and decrypted on the other device.

You can verify the end-to-end property by opening the Firestore console: the `messages` collection should contain only ciphertext and nonces, never plaintext.

## Acknowledgements

AES-256-GCM encryption is provided by [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) by Paul Miller, used in [`utils/encryption.js`](utils/encryption.js) for all message encryption and authentication.
