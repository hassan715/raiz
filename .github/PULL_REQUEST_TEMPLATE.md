### Describe the PR

A clear and concise description of what the pull request does. Include the motivation for the change and any context required to understand it.

### PR Checklist

**What kind of change does this PR introduce?** (check at least one)

- [ ] Bugfix (fixes an issue) - `fix(...)`, requires a patch version update
- [ ] Feature (adds a new feature) - `feat(...)`, requires a minor version update
- [ ] Enhancement (improves an existing feature) - `feat(...)`, requires a minor version update
- [ ] Security (resolves a vulnerability or improves cryptography) - `sec(...)`, requires a patch or minor update
- [ ] Refactor (rewriting code without changing behavior) - `refactor(...)`
- [ ] ARIA accessibility (fixes or improves a11y) - `fix(...)`, requires a patch or minor version update
- [ ] Documentation update (improves documentation or typo fixes) - `docs(...)`, requires a patch version update
- [ ] Other (please describe)

**Does this PR introduce a breaking change?** (check one)

- [ ] No
- [ ] Yes (Please describe how this breaks existing databases or workflows. Requires major/minor version bump.)

**The PR fulfills these Core Requirements:**

- [ ] It targets the `dev` branch, **not** the `master` branch.
- [ ] It addresses only one issue or feature. (If adding multiple features, break them into separate PRs).
- [ ] When resolving a specific issue, it's referenced in the PR's title (i.e. [...] (fixes #xxx[,#xxx]), where "xxx" is the issue number)
- [ ] The PR title follows the [**Conventional Commits**](https://www.conventionalcommits.org/) naming convention (e.g., `feat(auth): add biometric unlock`, `fix(ui): resolve overflow on mobile`).

**If new features/enhancements/fixes are added or changed:**

- [ ] Includes documentation updates
- [ ] Includes any needed TypeScript declaration file updates
- [ ] New/updated tests are included and passing (required for new features and enhancements)
- [ ] Existing test suites are passing (both Rust `cargo test` and frontend suites)
- [ ] CodeCov for patch has met the target (all new changes/updates have been tested)
- [ ] The changes have not impacted the functionality of other UI components or contexts
- [ ] Accessibility (a11y) has been taken into consideration (Does it affect screen reader users or keyboard-only users? Clickable items must be in the tab index, modals must trap focus, etc.)

**Security & Privacy Checklist (CRITICAL):**

- [ ] No sensitive user data (passwords, keys, recovery codes) is logged to the console or stdout.
- [ ] Cryptographic boundaries are respected (plaintext is never sent to a third-party API).
- [ ] If changing Rust memory structures, sensitive bytes are properly cleared/zeroed out when dropped.

**If adding a new feature:**

- [ ] A convincing reason for adding this feature is provided above (or linked to an approved Issue).
