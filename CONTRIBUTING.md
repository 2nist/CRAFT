# Contributing to Craft Tools Hub

Thank you for your interest in contributing to Craft Tools Hub! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect everyone to:

- Be respectful and considerate
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or inflammatory comments
- Publishing others' private information
- Other conduct deemed inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Git
- A code editor (VS Code recommended)
- Basic knowledge of React and Electron

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork:
   git clone https://github.com/YOUR_USERNAME/craft_tools_hub.git
   cd craft_tools_hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start development**
   ```bash
   npm run dev          # Start Vite dev server
   npm run electron:dev # Run Electron app
   ```

## Development Process

### Branch Naming

Use descriptive branch names:
- `feature/add-export-function` - New features
- `fix/quote-save-error` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/simplify-sync-logic` - Code refactoring
- `test/add-unit-tests` - Adding tests

### Commit Messages

Write clear, descriptive commit messages:

```
feat: add PDF export for quotes

- Implement PDF generation using jsPDF
- Add export button to quote detail view
- Include company logo and formatting
- Add tests for PDF generation

Closes #123
```

**Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

### Testing

All code should include appropriate tests:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Requirements:**
- All new features must include unit tests
- Bug fixes should include regression tests
- Maintain or improve code coverage
- Ensure all tests pass before submitting PR

### Code Quality

Before submitting, ensure your code passes linting:

```bash
# Run ESLint
npm run lint

# Auto-fix issues where possible
npm run lint --fix
```

## Coding Standards

### JavaScript/React

- Use modern ES6+ syntax
- Prefer functional components with hooks
- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code style

**Example:**
```javascript
// Good
const calculateTotalPrice = (items, taxRate) => {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
};

// Avoid
const calc = (i, t) => i.reduce((s, x) => s + x.p, 0) * (1 + t);
```

### File Organization

- One component per file
- Group related files in directories
- Use index.js for directory exports
- Keep file names descriptive and consistent

```
src/
├── components/
│   ├── QuoteList/
│   │   ├── QuoteList.jsx
│   │   ├── QuoteListItem.jsx
│   │   └── index.js
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Keep custom CSS minimal
- Use CSS modules for component-specific styles

## Submitting Changes

### Pull Request Process

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Go to GitHub and click "New Pull Request"
   - Select your branch
   - Fill out the PR template completely
   - Link related issues

4. **PR Review**
   - Address reviewer feedback promptly
   - Make requested changes
   - Keep discussion professional and constructive

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No new warnings or errors
- [ ] Dependent changes merged
- [ ] Reviewed by at least one maintainer

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

## Reporting Bugs

### Before Submitting

- Check existing issues to avoid duplicates
- Verify the bug exists in the latest version
- Collect relevant information (logs, screenshots, etc.)

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
Add screenshots if applicable

**Environment**
- OS: [e.g., Windows 11]
- App Version: [e.g., 1.0.0]
- Node Version: [e.g., 18.17.0]

**Additional Context**
Any other relevant information
```

## Feature Requests

We welcome feature suggestions! Please:

1. Check if the feature already exists or is planned
2. Clearly describe the feature and its benefits
3. Provide examples or mockups if possible
4. Explain your use case

### Feature Request Template

```markdown
**Is your feature related to a problem?**
Description of the problem

**Describe the solution**
How should this feature work?

**Alternatives considered**
Other solutions you've considered

**Additional context**
Screenshots, mockups, or examples
```

## Documentation

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples or tutorials
- Update outdated information
- Translate documentation

### Documentation Standards

- Write in clear, simple English
- Use code examples liberally
- Include screenshots for UI features
- Keep formatting consistent
- Test all code examples

## Community

### Getting Help

- **GitHub Discussions** - Ask questions, share ideas
- **GitHub Issues** - Report bugs, request features
- **Pull Requests** - Submit code changes

### Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Recognized in the community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, please:
- Open a discussion on GitHub
- Review existing documentation
- Ask in your pull request

---

**Thank you for contributing to Craft Tools Hub!** 🎉

Your contributions help make this project better for everyone.
