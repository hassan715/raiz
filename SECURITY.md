# Security Policy

As a password manager, the security and privacy of Raiz users is our highest priority. We take all vulnerabilities incredibly seriously.

## Supported Versions

Currently, Raiz is in active development. We only provide security patches for the latest major version.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

**DO NOT** open a public GitHub issue for security vulnerabilities. Doing so exposes our users to risk before a patch can be released.

If you believe you have found a security vulnerability (such as a flaw in our Rust cryptography, an Argon2id implementation error, or a cross-site scripting vulnerability in the React frontend), please report it directly to the maintainer via email: [raiz-app@protonmail.com](mailto:raiz-app@protonmail.com).

Please include:

- "SECURITY VULNERABILITY" in the subject line.
- A detailed description of the vulnerability.
- Steps to reproduce the exploit.
- (Optional) A proof-of-concept repository or script.

We'll endeavor to respond quickly, and will keep you updated throughout the process.
