# Raiz

**Raiz** is a hyper-secure, offline-first desktop password manager built with [Tauri](https://tauri.app/), [Rust](https://www.rust-lang.org/), and [React](https://reactjs.org/).

Designed for power users who refuse to trust their secrets to the cloud, Raiz stores everything locally on your machine. It utilizes a **True Zero-Knowledge Frontend architecture**, meaning your plaintext passwords are never exposed to the JavaScript heap, completely neutralizing browser-based memory-scraping malware.

---

## 📥 Download & Install

You do not need to build Raiz from source to use it! Pre-compiled executables are available for Windows, macOS, and Linux.

- **[Download the latest release here](https://github.com/hassan715/raiz/releases)** Simply download the appropriate installer for your operating system, run it, and follow the on-screen instructions to set up your offline vault.

---

## ✨ Characteristics & Core Features

- **100% Offline & Local:** No cloud sync, no accounts, no subscriptions. Your encrypted vault lives exclusively on your hard drive (`~/.raiz/data/` or `%USERPROFILE%\.raiz\data\`).
- **Dual-Key Architecture:** Locked by a Master Password, with a cryptographically secure 24-word BIP39 Recovery Phrase acting as a permanent failsafe.
- **Comprehensive Vault Types:** Store Logins, Secure Notes, Credit Cards, Identities, and Crypto Wallet Seed Phrases.
- **2FA Recovery Code Manager:** Securely store, mask, and track usage of backup recovery codes for your accounts.
- **Advanced Organization:** Group credentials using Inner Vaults (e.g., Personal, Work) and cross-cutting Global Tags.
- **Modern UI:** Built with Tailwind CSS and React Aria Components for a fast, accessible, and beautiful desktop experience.

---

## 🛡️ Security Architecture

Raiz goes beyond standard encryption. It is built defensively from the ground up to protect your data not just on the disk, but _in active memory_.

- **Ephemeral Session Keys (ESK):** The vault does not rest in plaintext in the Rust heap. Upon launch, Rust generates a random 32-byte session key pinned to RAM. The vault remains encrypted in active memory at all times.
- **Just-In-Time (JIT) Decryption:** When a user interacts with a credential, the backend decrypts the vault, executes the command, re-encrypts the data, and wipes the plaintext from the heap in microseconds.
- **Scrubbed IPC Bridge:** When populating the user interface, the Rust backend aggressively scrubs all sensitive fields (passwords, CVVs, seed phrases) from the data payload. The JavaScript (V8) garbage collector is completely blind to your secrets.
- **Air-Gapped Clipboard:** Clicking "Copy" on a password bypasses React entirely. The frontend sends an IPC signal to Rust, which fetches the secret and writes it directly to the OS clipboard, preventing clipboard-hijacking via JS.
- **Military-Grade Cryptography:**
  - **Key Derivation:** Argon2id (tuned for desktop memory constraints) protects against brute-force attacks.
  - **Encryption:** XChaCha20Poly1305 Authenticated Encryption guarantees confidentiality and detects file tampering instantly.

---

## 🛠️ Tech Stack

| Domain            | Technologies                                      |
| :---------------- | :------------------------------------------------ |
| **Core Backend**  | Rust                                              |
| **App Framework** | Tauri v2                                          |
| **Frontend**      | React 18, TypeScript, Vite                        |
| **Styling & UI**  | Tailwind CSS, Lucide Icons, React Aria Components |
| **Cryptography**  | `argon2`, `chacha20poly1305`, `bip39`, `zeroize`  |

---

## 🚀 Building from Source

For developers who want to contribute or compile the application themselves.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- OS-specific dependencies for Tauri (see [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation Steps

```bash
# 1. Clone the repository and navigate into it
git clone [https://github.com/hassan715/raiz.git](https://github.com/hassan715/raiz.git)
cd raiz

# 2. Install frontend dependencies
npm install

# 3. Run the development server
npm run tauri dev

# 4. Build for production
npm run tauri build
```
