# Contributing

Thanks for contributing to Focus Timer.

## Development Setup
1. Fork the repository.
2. Clone your fork.
3. Install dependencies:
```bash
npm install
```
4. Start development server:
```bash
npm run dev
```

## Branch and Commit Guidelines
- Create a focused branch per change.
- Keep commits small and descriptive.
- Use clear commit messages in imperative form.

## Pull Request Checklist
- Explain what changed and why.
- Link related issue(s) when available.
- Add/update tests for behavior changes.
- Include screenshots or short recordings for UI changes.
- Confirm tests pass:
```bash
npm test
```
- Confirm production build works:
```bash
npm run build
```

## Code Style
- Follow existing TypeScript and React patterns.
- Keep components and hooks focused and readable.
- Prefer small, composable functions over large blocks.

## Reporting Issues
When opening an issue, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and OS details
- Console/network errors (if any)

## Security
Do not open public issues for sensitive vulnerabilities.
Please contact maintainers privately for security disclosures.
