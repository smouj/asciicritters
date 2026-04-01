# Contributing to ASCIICritters 👋

First off, thank you for considering contributing to ASCIICritters! It's people like you that make open source such a great community.

## 📋 Table of Contents

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Adding a New Species](#adding-a-new-species)
- [Style Guidelines](#style-guidelines)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- Git
- A GitHub account

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/asciicritters.git
cd asciicritters

# Install dependencies
bun install

# Set up database
bun run db:push

# Start dev server
bun run dev
```

## 🤝 How to Contribute

### Reporting Bugs

1. Use [GitHub Issues](https://github.com/smouj/asciicritters/issues/new?template=bug_report.md)
2. Include: steps to reproduce, expected behavior, screenshots, environment info

### Suggesting Features

1. Use [GitHub Issues](https://github.com/smouj/asciicritters/issues/new?template=feature_request.md)
2. Describe the feature, use case, and expected behavior

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run linting: `bun run lint`
5. Test thoroughly
6. Commit with clear messages
7. Push and open a Pull Request

## 🐾 Adding a New Species

Follow this template when adding a species to `src/lib/pets/species.ts`:

```typescript
{
  id: 'octopus',
  name: 'Octopus',
  description: 'A clever eight-armed ocean dweller.',
  personality: 'curious, artistic, slightly chaotic, loves puzzles',
  asciiArt: `...`, // Your ASCII art here
  color: '#8b5cf6',
  glowColor: '#7c3aed',
  rarity: 2, // 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary
}
```

**ASCII Art Guidelines:**
- Use monospace characters only
- Keep it under 20 lines
- Max width ~40 characters
- Test rendering in the 3D canvas
- Use `\` to escape backslashes

## 📏 Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use descriptive variable names
- Add JSDoc for public functions

### React

- Use functional components with hooks
- Keep components small and focused
- Use `'use client'` directive when needed
- Props should be typed with interfaces

### Styling

- Use Tailwind CSS utility classes
- Follow the dark theme color palette
- All border radiuses: `rounded-[1px]` (1px)
- Use CSS variables for colors defined in `globals.css`

### API Routes

- Use Next.js App Router API routes
- Validate input with Zod schemas
- Return proper HTTP status codes
- Include error messages in responses

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new Octopus species
fix: resolve chat memory leak
docs: update README installation guide
style: format code with prettier
refactor: simplify pet generation logic
test: add unit tests for RNG
chore: update dependencies
```

## 🔄 Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure `bun run lint` passes
4. Keep PRs small and focused
5. Respond to review feedback promptly

## ❓ Questions?

Feel free to open an issue with the `question` label.

---

Thank you for contributing! 🎉
