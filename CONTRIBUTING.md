# Contributing to SlotForge

Thanks for helping make institutional scheduling more transparent and accessible.

## Before you start

1. Search [existing issues](https://github.com/revanthlol/SlotForge/issues).
2. Open an issue for a substantial behavior or architecture change so the scope is visible.
3. Fork the repository and branch from `dev`.

Good contributions include bug fixes, tests, accessibility work, documentation, constraint templates with complete solver behavior, performance improvements, and carefully scoped product enhancements.

## Development workflow

```bash
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch -c feature/short-description
```

Keep changes focused. Preserve tenant scoping on every API path and never commit secrets, `.env` files, user data, production URLs, tokens, or credentials.

Run the relevant checks before opening a pull request:

```bash
cd frontend && npm run build && npm run lint
cd ../backend && PYTHONPATH=. .venv/bin/pytest -q
```

For UI changes, include before/after screenshots and test keyboard navigation, reduced motion, light/dark themes, and the intended viewport. For schema changes, add an Alembic migration, update `docs/database/schema.sql`, and explain the tenancy/security impact.

Open pull requests against `dev`, describe why the change is needed, list exact verification, and disclose known limitations. By contributing, you agree that your work is licensed under the repository’s MIT License.

## Conduct and security

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report vulnerabilities using [SECURITY.md](SECURITY.md), not a public issue.
