# 🔐 E2EE Chat App - End-to-End Encrypted Mobile Messaging

> **Project Goal:** Build a mobile chat application where messages are encrypted **before** leaving the device. The server stores only ciphertext and cannot read user messages.
>
> **Course:** Introduction to Cybersecurity | **Timeline:** 9 Weeks | **Team:** 6 Students

---

## ⚠️ CRITICAL RULES (READ FIRST)

1.  **🔒 NEVER Commit `.env` Files:** Your `.env` file contains Firebase secrets. If you commit this to GitHub, bots will steal them. It is in `.gitignore` for a reason.
2.  **🛑 NEVER Push to `main`:** The `main` branch is protected. You must create a **Feature Branch** and open a **Pull Request**.
3.  **🔑 NEVER Share Keys in Public Chat:** Firebase keys and Encryption keys should be shared via DM or secure channels only.
4.  **🧪 TEST BEFORE PUSHING:** Ensure the app runs on your phone before pushing code. Don't break the build for everyone.

---

## 📋 Prerequisites

Ensure you have these installed **before** starting:

1.  **[Node.js](https://nodejs.org/)** (Install the **LTS** version, e.g., v18 or v20).
2.  **[Git](https://git-scm.com/)** (For version control).
3.  **[VS Code](https://code.visualstudio.com/)** (Recommended editor).
4.  **[Expo Go](https://expo.dev/go)** (Install this app on your **physical phone** from App Store/Play Store).
5.  **[GitHub Account](https://github.com/)** (Make sure you accepted the repo invite).

---

## 🚀 Installation & Setup Guide

Follow these steps exactly to get the app running on your machine.

### 1. Clone the Repository
Open your terminal (Command Prompt, Terminal, or VS Code Terminal) and run:

```bash
git clone https://github.com/stephkmn/e2ee-chat-app.git
cd e2ee-chat-app
```
### 2. Install Dependencies
This downloads all the libraries needed for the app (React Native, Firebase, Crypto, etc.).

```bash
npm install
```
### 3. Configure Environment Variables (🔒 Critical)
We store Firebase API keys in a file called `.env`. This file is ignored by Git to prevent leaking secrets.

#### 1) Copy the example file:
```bash
# Mac/Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# Windows (Command Prompt)
copy .env.example .env
```

#### 2) Get the keys
The keys will be in the `#env-values` channel under `Project channels` in the Discord server when they're ready.

#### 3) Paste the values
- Open the newly created .env file in VS Code.
- Paste the values next to the corresponding keys (do not delete the key names).
- Save the file.

### 4. Run the App
Start the development server:
```bash
npx expo start
```
- A QR code will appear in your terminal and browser.
- Open **Expo Go** on your phone.
- **iOS**: Scan the QR code with your Camera app.
- **Android**: Scan the QR code directly within the Expo Go app.

## 🌳 Git Workflow (Collaboration Rules)
To avoid breaking each other's code, follow these rules strictly:

### 1. Never Push to `main`
The `main` branch is protected. If you try to push to it, GitHub will reject you.

### 2. Use feature branches
Always create a new branch for your task:
```bash
# 1. Make sure you are on dev branch
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b feature/your-task-name
```

### 3. Commit & Push
```bash
git add .
git commit -m "feat: added login button"
git push origin feature/your-task-name
```

### 4. Create a Pull Request (PR)
1. Go to the GitHub repo page.
2. Click **Pull Requests** → **New Pull Request**.
3. Compare `feature/your-task-name` → `dev`.
4. Assign a teammate to **Review your code**.
5. Once approved, merge it.

## 🔍 Security Validation Checklist
- [ ] Verify messages in Firestore console show only ciphertext
- [ ] Confirm `.env` is in `.gitignore` and not committed
- [ ] Test that unauthenticated users cannot read/write Firestore
- [ ] Validate IV is random per message (check logs/debug output)

## 🛡 Security Architecture
This is an **educational implementation of E2EE**. Here is how we ensure security:
| Component | Implementation | Security Benefit |
| :--- | :--- | :--- |
| Encryption Algorithm | AES-256 (CBC Mode) | Industry-standard symmetric encryption. |
| Initialization Vector | Random IV per message | Prevents pattern analysis (identical messages look different). |
| Key Storage | expo-secure-store | Keys are encrypted at rest on the device hardware. |
| Key Exchange | QR Code (Visual) | Keys never traverse the network during exchange. |
| Database | Firebase Firestore | Server stores only ciphertext. Even if DB is leaked, messages are safe. |
| Access Control | Firestore Security Rules | Only authenticated users can read/write data. |

## ⚠️ Limitations (Educational Context)
**Key Management**: Uses a simple shared secret model. Production apps (like Signal) use Double Ratchet protocol for forward secrecy.
**Authentication**: Uses Firebase Auth. We trust Firebase for identity verification.
**Metadata**: While message content is encrypted, metadata (who talked to whom and when) is visible to the server.

## 📂 Project Structure
```bash
secure-chat-app/
├── assets/              # Images and static files
├── components/          # Reusable UI components (Buttons, Inputs)
├── screens/             # App screens (Login, Chat, Register)
├── services/            # Firebase configuration & Auth logic
├── utils/               # Security utilities (Encryption, SecureStore)
├── .env                 # ⚠️ IGNORED BY GIT (Contains Secrets)
├── .env.example         # Template for environment variables
├── .gitignore           # Git ignore rules
└── App.js               # Entry point
```

## 📅 Project Timeline (9 Weeks)
| Phase | Weeks | Focus | Deliverable |
| :--- | :--- | :--- | :--- |
| Setup | 1-2 | Repo setup, Firebase config, Learning React Native | "Hello World" on all phones |
| Auth | 3-4 | Login/Register UI, Firebase Auth Integration | Can create account & login |
| Core | 5-6 | Encryption Logic, Firestore Messaging, Secure Store | Can send encrypted message |
| Exchange | 7 | QR Code Key Exchange Implementation | Two phones can chat securely |
| Polish | 8 | Bug Fixes, Testing, Security Analysis | Stable Beta Version |
| Submit | 9 | Final Report, Demo Video, Presentation | Submission |

## 👥 Team Roles
| Pair | Role | Focus Area | Members |
| :--- | :--- | :--- | :--- |
| Pair 1 | Auth & Nav | Login, Register, Navigation Stack | [Joshua Trinh], [Name] |
| Pair 2 | Chat UI | Chat List, Chat Room, Styling | Nathan Fender, [Name] |
| Pair 3 | Security & Infra | Encryption, Firebase Config, Rules | Aranzazu Romero, [Name] |

## 🐛 Troubleshooting
| Issue | Solution |
| :--- | :--- |
| npm install fails | Delete node_modules folder and package-lock.json, then run npm install again. |
| App won't load on phone | Ensure your phone and computer are on the same Wi-Fi network. |
| .env errors | Check that you copied .env.example to .env and pasted the keys correctly. No spaces around =. |
| Git conflicts | Pull the latest changes (git pull origin dev) before starting work every day. |
| Firebase Permission Denied | Check Firestore Security Rules in Firebase Console. |

## ❓ Stuck?
Post your error message in the `#coding-help` Discord channel. Include:
1. What you were trying to do.
2. The error message (screenshot).
3. What you tried to fix it.

## ✅ First Day Checklist
- Installed Node.js & Git
- Cloned the repo
- Ran `npm install`
- Created `.env` file with valid keys
- Successfully ran `npx expo start`
- Opened the app on your phone via Expo Go
- Joined the Discord server
- Read the Git Workflow section
