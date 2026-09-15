# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/kolevmvk/careerops/security/advisories/new). Do not open a public issue.

You can expect an acknowledgement within 5 working days and a status update within 14 days.

## Supported versions

Only the latest release on `main` receives security fixes.

## Data policy: public code, private data

CareerOps stores personal career information. The repository is public; the data is not.

- The repository contains only a **fictional demo persona**. Real career data lives in the production database and in encrypted backups, never in git.
- Operational details of restricted employment are **never stored**, not even as private records. Only approved abstractions are.
- Every table is protected by row-level security, verified by automated tests.
- AI providers receive only records explicitly marked as allowed, and never private contacts or restricted data.

## Controls in this repository

| Control                                                  | Where                             |
| -------------------------------------------------------- | --------------------------------- |
| Secret scanning with push protection                     | GitHub repository settings        |
| gitleaks over full history                               | `.github/workflows/security.yml`  |
| CodeQL static analysis                                   | `.github/workflows/security.yml`  |
| Dependency review on pull requests                       | `.github/workflows/security.yml`  |
| Supply-chain posture                                     | `.github/workflows/scorecard.yml` |
| Actions pinned to commit SHAs, minimal token permissions | all workflows                     |
| Protected branches with required checks                  | repository rulesets               |
