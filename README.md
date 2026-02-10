# catport

<p align="center">
  <samp>Deterministic filesystem serializer for LLM context generation.</samp>
  <br><br>
  <a href="https://www.npmjs.com/package/catport">
    <img src="https://img.shields.io/npm/v/catport?style=flat-square&color=000" alt="npm" />
  </a>
  <a href="https://github.com/Jelodar/catport/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Jelodar/catport?style=flat-square&color=000" alt="license" />
  </a>
  <img src="https://img.shields.io/badge/dependencies-0-000?style=flat-square" alt="zero dependencies" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-000?style=flat-square" alt="node" />
</p>

---

**catport** is a high-performance, **zero-dependency** Node.js tool that converts complex project directories into clean, structured, token-efficient text streams suitable for Large Language Models — and back again.

It functions as a high-fidelity, bidirectional conduit:

1.  **Bundling**: Scans source directories, applies rigorous filtering (gitignore, binary detection), performs language-aware code optimization (minification), and produces a structured output stream.
2.  **Extraction**: Ingests `catport` bundles (or LLM responses), validates structure, prevents path traversal attacks, and restores the filesystem.

All while respecting `.gitignore`, token budgets, code minification, and filesystem security.

---

## See it in action

```console
$ catport -g HEAD -O minify -o context.md

> Found 4 files changed in git (HEAD)
> Optimizing (language-aware)...

✔ Success Bundled 4 files (~5730 tokens) to context.md
```

---

## Why catport?

In an era of integrated AI tools like Cursor or Claude Code, you might wonder why a standalone CLI is necessary. The answer lies in control and composability.

Integrated tools are often black boxes. They use hidden heuristics to select context, locking you into their specific workflow and API. Catport takes a rigorous engineering approach. It generates pure, deterministic text that you can pipe anywhere. You can feed it to local Ollama instances, the ChatGPT web UI, or custom CI pipelines. You are not tied to a specific vendor.

It also solves the token economy problem. Most IDE plugins dump raw text, wasting valuable context window space. Catport's syntax-aware minification reduces payload size significantly, allowing you to fit more logic into the model's memory without losing meaning.

Cursor is built for flow. Catport is built for engineering. It is the `tar` command for the LLM age. Simple, fundamental, and model-agnostic.

### vs The World

| Feature | `catport` | `tar` / `cp` | IDE Plugins |
| :--- | :---: | :---: | :---: |
| **Output** | LLM-Ready Text | Binary / Raw | Raw Text |
| **Git Aware** | ✅ | ❌ | ⚠️ |
| **Token Budget** | ✅ | ❌ | ❌ |
| **Minification** | ✅ | ❌ | ❌ |
| **Restorable** | ✅ | ✅ | ❌ |
| **Dependencies** | 0 | 0 | Many |

---

## Features

*   **Zero Dependencies**: Built entirely on the Node.js standard library. No bloat, no supply chain risks.
*   **Polyglot Minification**: Advanced, syntax-aware whitespace removal for common file extensions and languages (JS, Python, Rust, Go, SQL, etc.).
*   **Token Budgeting**: Prioritize essential files (`README.md`, `src/core/`) and hard-stop when a token limit is reached.
*   **Git Aware**: Smartly filters `.gitignore` rules and can bundle only files changed relative to a specific git commit/branch.
*   **Secure Extraction**: Sandboxed extraction prevents malicious paths (`../../etc/passwd`) from escaping the target directory.
*   **Multiple Formats**: Output to Markdown, XML (CDATA), JSON, YAML, or MIME Multipart based on your prompting strategy.
*   **Custom Transforms**: Pipe file content through external shell commands (e.g., `sed`, `awk`, `terser`) for limitless customization.

---

## Installation

### CLI Usage

Install globally to use as a command-line tool:

```bash
npm install -g catport
```

### Library Usage

Install as a dev dependency to use within your build scripts:

```bash
npm install -D catport
```

---

# CLI Usage

## Quick Start

### Bundling (Code to Text)

The default behavior bundles the current directory into a Markdown file.

```bash
# Bundle current directory to stdout
catport

# Bundle specific paths to a file
catport src/ tests/ -o context.md

# Bundle only git changes (unstaged + staged vs main)
catport -g main -o diff.md
```

### Extraction (Text to Code)

Extract code blocks from an LLM response or an existing bundle.

```bash
# Extract from a file to the current directory
catport -x response.md

# Extract to a specific directory
catport -x response.md -d ./output/
```

---

## CLI Reference

### General Options

| Flag                    | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| `-h, --help`            | Show help                                                                   |
| `-V, --version`         | Show version                                                                |
| `-v, --verbose`         | Verbose logging (skipped files, token estimates, priority scores)          |
| `-o, --output <file>`   | Write to file instead of stdout                                             |

### Bundling Options

| Flag                              | Description                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------|
| `-f, --format <fmt>`              | `md` / `xml` / `json` / `yaml` / `multipart` (default: `md`)                                   |
| `-R, --reply-format <fmt>`        | Tell the LLM which format to reply in (useful when sending MD but wanting XML back)                |
| `-C, --context "<text>"`          | Prepend custom system prompt / context block                                                        |
| `-T, --task "<text>"`             | Append task instruction at the end                                                                  |
| `-I, --no-instruct`               | Disable auto-generated "how to reply" instructions                                                  |
| `-n, --no-structure`               | Disable directory structure generation                                                              |
| `-l, --list-dirs`                  | Include directories in the structure listing                                                         |
| `-k, --skeleton`                  | Output only directory tree (no file contents) – great for high-level context before deep dives     |
| `-O, --optimize <mode>`           | `none` / `whitespace` / `comments` / `minify` OR shell command (default: `none`)                        |
| `-S, --max-size <size>`           | Max size per file to process (e.g. `1MB`, `500KB`). Larger files are skipped unless custom transform is used. (default: `10MB`) |
| `-c, --chars-per-token <n>`       | Characters per token for budget estimation (default: `4.2`)                                        |
| `-P, --concurrency <n>`           | Max concurrent file reads (default: `32`)                                                           |

### Filtering & Scoping

| Flag                              | Description                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------|
| `-e, --extensions <list>`         | Comma-separated extensions to include (e.g. `js,ts,py,rust`)                                        |
| `-i, --ignore <glob>`             | Additional ignore globs (can be repeated)                                                           |
| `-u, --no-ignore`                 | **Unrestricted mode** – ignore `.gitignore` and built-in exclusions                                 |
| `-g, --git-diff [ref]`            | Only changed files vs `ref` (default: `HEAD`). Omit ref → unstaged + staged + untracked changes      |
| `-b, --budget <tokens>`           | Stop bundling when estimated tokens exceed this number                                              |
| `-p, --priority <rule>`           | `pattern:score` – higher score = bundled earlier when budget is tight (can be repeated)             |

### XML-Specific

| Flag                              | Description                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------|
| `-X, --xml-mode <mode>`           | `auto` (default), `cdata`, or `escape`                                                              |

### Extraction Options

| Flag                              | Description                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------|
| `-x, --extract`                   | Enable extraction mode                                                                              |
| `-d, --extract-dir <dir>`         | Target directory (default: current directory)                                                       |
| `-U, --unsafe`                    | **Disable security sandbox** – allow `../` and absolute paths (use only in trusted environments)   |

---

## Optimization Levels (`-O`)

| Mode       | What it does                                                                                 |
|------------|----------------------------------------------------------------------------------------------|
| `none`     | Verbatim content                                                                             |
| `whitespace`| Trim trailing whitespace, collapse blank lines                                              |
| `comments` | + Remove `//`, `#`, `/* */` comments                                                         |
| `minify`   | Advanced language-aware minification (preserves strings, regex, heredocs, indentation logic) |

---

## Deep Dive: Custom Transforms

`catport`'s design philosophy favors the "Unix Way"—small tools working together. Instead of building a plugin system for every possible modification (obfuscation, transcoding, redaction), `catport` allows you to pipe file content through **any shell command**.

You can pass a command string to `--optimize` (`-O`) instead of a preset mode. This enables you to use standard tools like `sed`, `awk`, `tr`, or external CLI binaries.

### Mode A: Standard Streams (Piping)

If your command string does **not** contain the placeholder `{}`, `catport` will spawn your command as a child process.
1.  It writes the file's original content to the child process's `stdin`.
2.  It captures the `stdout` as the new file content.
3.  It bundles the result.

**Examples:**

```bash
# Redact sensitive keys using sed
catport -O "sed 's/API_KEY=[a-zA-Z0-9]*/API_KEY=REDACTED/g'"

# Convert all text to uppercase (using tr)
catport -O "tr '[:lower:]' '[:upper:]'"

# Prepend a copyright header to every file
catport -O "cat copyright_header.txt -"
```

### Mode B: File Replacement (Placeholder)

If your command string contains `{}`, `catport` will substitute `{}` with the **absolute path** of the file being processed.
1.  It executes the command directly.
2.  It captures `stdout` as the new content.
3.  It ignores the original file content reading stream (optimization: prevents double reading).

This is useful for tools that expect a file path argument rather than stdin, or when you want to output metadata about a file instead of its content.

**Examples:**

```bash
# Use an external minifier (e.g., uglify-js)
catport -O "uglifyjs {} --compress --mangle"

# Bundle file statistics instead of content
catport -O "stat {}"

# Use wc to count lines
catport -O "wc -l {}"
```

### Supported Languages at `minify` mode

When using the built-in `minify` mode, `catport` uses a custom, zero-dependency tokenizer that understands the syntax of these languages to safely remove comments and whitespace without breaking strings or regex literals:

- **Web**: JavaScript, TypeScript, JSX/TSX, HTML, CSS, SCSS, Less
- **Scripting**: Python, Ruby, Perl, PHP, Lua, Bash/Zsh, PowerShell, Batch
- **Systems**: C, C++, C#, Java, Go, Rust, Swift, Kotlin
- **Data/Config**: JSON, YAML, XML, SQL, INI, TOML, Dockerfile, Clojure
- **Docs**: Markdown (collapses whitespace, strips HTML comments)

---

## Deep Dive: Git Integration (`-g`)

The `-g` or `--git-diff` flag turns `catport` into a smart diffing tool for LLMs. It leverages your local `git` binary to identify changed files.

### 1. Working Directory Changes (`-g` or `-g HEAD`)
By default, `catport -g` (equivalent to `-g HEAD`) bundles:
1.  **Staged changes**: Files you have `git add`-ed.
2.  **Unstaged changes**: Modified files you haven't added yet.
3.  **Untracked files**: New files (unless ignored).

This is perfect for "Review my current work" prompts.

### 2. Branch Comparisons (`-g main`)
When you provide a ref, `catport` runs `git diff --name-only <ref>` to find files that differ between your current state and that reference.
*   `catport -g main`: What has changed in my feature branch vs main?
*   `catport -g v1.0.0`: What has changed since the last release?

### 3. CI/CD Usage
You can use this in CI pipelines to generate changelogs or automated PR summaries.
```bash
# In a GitHub Action
catport -g origin/main -O minify -o changes.md
# Send changes.md to LLM...
```

---

## Deep Dive: Token Budgeting & Priority

Context windows are limited (e.g., 32k, 128k, 1M tokens). `catport` helps you maximize value within that limit using `-b` (budget) and `-p` (priority).

### How Counting Works
`catport` uses a heuristic: `Length in Chars / charsPerToken` (Default 4.2). This is faster than running a real tokenizer (like cl100k_base) and accurate enough for estimation.

### The Algorithm
1.  **Scan**: All matching files are found.
2.  **Score**: Each file is assigned a priority score (Default: 1).
    *   Files matching a `-p` rule get that rule's score.
    *   Example: `-p "package.json:100"` gives `package.json` score 100.
3.  **Sort**: Files are sorted by Score (Descending) -> Name (Ascending).
4.  **Bundle**: `catport` iterates through the sorted list.
    *   It calculates the token cost of the file.
    *   `Current Total + File Cost <= Budget`? Include it.
    *   `Current Total + File Cost > Budget`? Skip it (and log a warning).

### Skeleton Mode (`-k`)
If your project is huge, start with `-k`.
1.  Run `catport -k > tree.md`
2.  Send `tree.md` to the LLM: *"Here is my file structure. Where should I add the new AuthController?"*
3.  LLM responds with a path.
4.  Run `catport src/controllers/AuthController.ts` to get context for just that file.

---

## Output Formats

| Format      | Flag       | Best Use Case                                          |
|-------------|------------|--------------------------------------------------------|
| Markdown    | `md`       | Highest readability for most LLMs                      |
| XML         | `xml`      | Strict parsing, CDATA prevents hallucinated fences     |
| JSON        | `json`     | Programmatic consumption, easy to parse post-LLM       |
| YAML        | `yaml`     | Clean, human-readable alternative to JSON              |
| Multipart   | `multipart`| Clean, low-complexity, token-saving format             |

---

## Configuration File (`.catport.json`)

`catport` looks for a `.catport.json` file in the current working directory.
 CLI flags override these values.

```json
{
  "format": "xml",
  "optimize": "minify",
  "budget": 60000,
  "maxSize": "5MB",
  "charsPerToken": 4.0,
  "gitDiff": "origin/main",
  "ignore": [
    "dist/",
    "node_modules/",
    "**/*.test.ts"
  ],
  "priority": [
    "README.md:200",
    "package.json:150",
    "src/**:80",
    "*.md:50"
  ],
  "replyFormat": "xml",
  "xmlMode": "auto",
  "concurrency": 32
}
```

---

## Programmatic Usage

You can use `catport` directly in your Node.js applications.

```javascript
import { Bundler, Extractor, NodeIO } from 'catport';

// 1. Bundle files
const config = {
  paths: ['./src'],
  format: 'xml',
  optimize: 'comments', // 'none', 'whitespace', 'comments', 'minify'
  ignore: ['**/*.spec.ts']
};

// Writes to stdout by default, or provide a custom IO writer
await Bundler.run(config, NodeIO);

// 2. Extract files
const extractConfig = {
  paths: ['response.xml'],
  extractDir: './output'
};

await Extractor.run(extractConfig, NodeIO);
```

---

## Security (Extraction Mode)

By default, extraction is **sandboxed**:

- All paths are normalized and resolved relative to `--extract-dir`
- `../` sequences that escape the target directory are blocked
- Absolute paths are rejected
- Hidden files (`.env`, `.git`) are allowed only if explicitly included

Use `--unsafe` (`-U`) **only** when you fully trust the source (e.g., internal automation).

---

## Use Cases & Workflows

| Workflow                              | Typical Command Sequence                                                                      |
|---------------------------------------|-----------------------------------------------------------------------------------------------|
| **Code review**              | `catport -g main -O minify -b 60000 -o context.md → send → receive → catport -x response.md`      |
| **Agentic coding loop**               | Use `--reply-format xml` + `--format xml` for reliable round-tripping                        |
| **High-level planning**               | `catport -k > tree.md` → ask LLM for architecture suggestions → then deep dive               |
| **Token-constrained models**          | `-b 16000 -O minify` with strong priority rules                                                   |
| **Editor plugin / AI pair programmer**| Programmatic API + `--skeleton` + selective `-p` rules                                       |

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](https://github.com/Jelodar/catport/blob/main/CONTRIBUTING.md) for details on the architectural philosophy (Unix-style pipes, zero-deps) and coding standards.

## License

MIT