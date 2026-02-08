




# Contributing to catport

Thank you for your interest in contributing!  
**catport** is a deliberately minimalist, zero-dependency Node.js tool that follows the Unix philosophy to the letter. To keep it fast, reliable, and composable for years to come, we enforce strict principles. Contributions that respect these constraints are merged quickly; anything that introduces complexity or deviates from the core mission will be politely declined.

## Project Philosophy

**catport** strictly adheres to the Unix tradition: *Do one thing, and do it well.*

- It is a pure filter: reads text from stdin, writes text to stdout, and does nothing else.
- It must remain predictable, composable, and pipeline-friendly.
- It works seamlessly with core utilities (`cat`, `grep`, `sed`, `awk`, `jq`, shell redirects, etc.).
- No hidden side effects, no unsolicited output to stderr unless reporting genuine errors, no unnecessary features.

If a proposed feature cannot be meaningfully used in a one-liner, it does not belong in catport.

## Core Technical Constraints

- **Zero external dependencies**  
  We use only Node.js built-in modules. No lodash, chalk, commander, or any other third-party packages.  
  This keeps the project lightweight, eliminates supply-chain risks, simplifies installation, and guarantees long-term maintainability.
  *Note: This means you cannot simply `npm install` a library to solve a problem. You must write the logic yourself or stick to the standard library.*

- **Performance First**  
  The tool must stay fast and memory-efficient even when processing large amount of text or being part of a long pipeline over large codebases. Avoid blocking I/O where possible; prefer streaming transforms.

- **No build step**  
  Plain JavaScript (ESM) that runs directly on Node.js ≥ 20. No transpilation, no bundlers.

- **Clarity over cleverness**  
  The entire implementation should be understandable in one sitting by anyone familiar with Node.js streams.

## Contribution Guidelines

1. **Open an issue first** for anything beyond trivial fixes — let’s agree the change aligns with the project’s scope.
2. Add or update tests when touching functionality (`npm test` must pass).
3. Keep the binary small and the `--help` output concise.
4. Update README or man page if you introduce visible behavior changes.

## Development Setup

Clone the repository and install development dependencies (linting only):

```bash
git clone https://github.com/Jelodar/catport.git
cd catport
npm install
```
Required runtime: **Node.js ≥ 20.0.0**


### Directory Structure

*   `src/cli/`: **Interface Layer**. Handles argument parsing, validation, and UI output.
*   `src/core/`: **Business Logic Layer**.
    *   `Bundler`: Orchestrates the flow.
    *   `Scanner`: Generator-based filesystem walker.
    *   `Extractor`: Parser and writer for restoring files.
    *   `Analyzer`: Heuristics for binary detection and token counting.
*   `src/formatters/`: **Strategy Pattern**. Pluggable output formats (Markdown, XML, etc.).
*   `src/optimizers/`: **Optimization Layer**. Language-aware tokenizers.
*   `src/utils/`: **Infrastructure**. Stateless helpers (IO, Git, Logger).

Please see [ARCHITECTURE.md](ARCHITECTURE.md) for more architectural details.

### Data Flow

1.  **CLI** parses arguments (zero-dep) -> Config Object.
2.  **Scanner** yields `FileItem` objects lazily.
3.  **Analyzer** enriches `FileItem` (isBinary, priority score).
4.  **Bundler** filters, sorts, and batches `FileItems`.
5.  **Processor** determines whether to use internal `Optimizer` or external shell commands.
6.  **Optimizer** (if used) transforms content (Strategy).
7.  **Formatter** serializes content (Strategy).
8.  **IO** writes to stream.

### Testing

We use the native `node:test` runner. All new features and bug fixes must include unit tests.

### Running Tests

Run the full test suite:

```bash
# Run all tests
npm test

# Run specific suite
node --test tests/unit/scanner.test.js
```

All tests must pass and code must be formatted before a PR is considered.

## Contribution examples

### Adding a New Format

1.  Create `src/formatters/<format>.js`.
2.  Implement the required methods: `header(meta)`, `file(fileObj)`, `footer(meta)`, `parse(text)`.
3.  Register the format in `src/formatters/index.js`.
4.  Add unit tests in `tests/unit/formatters.test.js`.

### Adding a New Optimizer

*   **External (Preferred for one-offs)**: If you need a specific transformation (e.g., Minifying a rare language), consider simply using the `-O "command"` feature rather than modifying the core code. This aligns with our zero-dependency philosophy by leveraging user-installed tools (like `black` for Python or `gofmt` for Go).
*   **Internal (Core support)**: To add native support for a new language in `minify` mode:
    1.  Update `src/optimizers/definitions.js` with language-specific syntax rules (comments, strings, etc.).
    2.  If complex logic is needed (e.g. non-standard string delimiters), update the `Tokenizer` state machine in `src/optimizers/tokenizer.js`.
    3.  Add unit tests in `tests/unit/optimizer.test.js`.


## Contribution Workflow

1. **Open an issue first** for anything more than a typo or obvious bug fix.  
   We want to confirm the change fits the project’s narrow scope before code is written.
2. Fork & create a descriptively named branch (`fix/xyz`, `feat/xyz`).
3. Write clean, tested code that respects the constraints above.
4. Update README and/or `--help` output if user-visible behavior changes.
5. Submit a Pull Request with:
   - A clear description of the problem and solution
   - Reference to the related issue

Small, focused PRs are strongly preferred.

If you’re unsure whether something fits, just ask in an issue — we’re friendly and respond quickly.

Thank you for helping keep **catport** fast, simple, and true to the Unix way!