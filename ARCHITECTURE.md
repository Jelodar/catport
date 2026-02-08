




# System Architecture

**catport** is a modular, functional CLI utility designed around stream processing principles and the Strategy design pattern.

## Core Components

### 1. CLI Layer (`src/cli/`)

*   **main.js**: The entry point. It initializes the IO interface, loads configuration, and invokes the Bundler or Extractor.
*   **args.js**: A custom, zero-dependency argument parser. It handles flag parsing, type coercion, and schema validation against `src/config/options.js`.
*   **ui.js**: Manages `stdout` and `stderr` formatting. It provides ANSI color support via `src/utils/style.js`.

### 2. Business Logic (`src/core/`)

*   **Scanner**: A generator-based file system walker.
    *   **Logic**: It recursively traverses directories.
    *   **Filtering**: It parses `.gitignore` files at each directory level, creating a scoped ignore chain to correctly handle nested repositories and exclusions. It maintains a stack of "Ignore Matchers" where rules in deeper directories override or extend rules from parents.
    *   **Lazy Evaluation**: Files are yielded one by one to keep memory usage low, regardless of project size.

*   **Bundler**: The orchestration engine.
    *   **Input**: Consumes the `Scanner` iterator.
    *   **Processing**: Applies priority sorting, binary detection, and token budgeting.
    *   **Concurrency**: Uses a batched `Promise.all` approach to read files in parallel (controlled by the `--concurrency` flag).

*   **Processor**: The file content transformation unit.
    *   **Reading**: Reads the file content (initially a small sample to detect binary, then the full content if text).
    *   **Optimization Strategies**:
        *   **Internal**: If a standard mode (`minify`, `comments`, etc.) is selected, it delegates to the `Optimizer` service.
        *   **External (Custom Transforms)**: If `config.optimizeCmd` is set (via `-O "cmd"`), the Processor bypasses the internal logic. It detects if `{}` is present in the command string.
            *   **With `{}`**: It invokes `io.exec(cmd)` replacing `{}` with the quoted, absolute file path.
            *   **Without `{}`**: It invokes `io.execPipe(cmd, content)` passing the raw content to the child process's stdin.
    *   This allows for infinite extensibility via standard Unix tools (sed, awk, grep, external minifiers).

*   **Extractor**: The parsing engine.
    *   **Input**: Reads from `stdin` or a file.
    *   **Parsing**: Delegates to the appropriate `Formatter` to reconstruct file objects.
    *   **Security**: Enforces the sandbox. It resolves target paths and ensures they do not escape the extraction root via `..` segments.

*   **Analyzer**: Analysis utilities.
    *   **Binary Detection**: checks the first 1024 bytes of a buffer for null bytes.
    *   **Token Counting**: Uses a heuristic (char length / `charsPerToken`) for performance.
    *   **Priority Scoring**: Assigns priority scores to files based on pattern matching rules.

### 3. Strategy Layer

*   **Formatters** (`src/formatters/`): Pluggable serialization strategies.
    *   Each formatter implements a standard interface: `header(meta)`, `file(fileObj)`, `footer(meta)`, and `parse(text)`.
    *   Supported strategies: Markdown, XML, JSON, YAML, Multipart.

*   **Optimizers** (`src/optimizers/`): Language-aware code optimization.
    *   **Tokenizer**: A custom state machine (DFA) that parses source code byte-by-byte.
    *   **Definitions**: Language-specific configurations (e.g., `src/optimizers/langs/python.js`) define valid comments, string delimiters, and regex literals.
    *   **Safety**: The tokenizer identifies strings and regex literals to ensure that content within them is never modified, while safely removing surrounding whitespace and comments.
    *   **Normalization**: Uses string enum values (`'minify'`, `'comments'`, `'whitespace'`) to select the strategy, ensuring configuration consistency across the app.

### 4. Utilities (`src/utils/`)

*   **NodeIO**: A dependency injection wrapper for `node:fs`, `node:process`, and `node:child_process`. This allows the core logic to be unit-tested with a mock file system without mocking native modules.
*   **Logger**: Provides leveled logging (ERROR, WARN, INFO, DEBUG).

## Data Flow

### Bundling Process

1.  **CLI** parses arguments -> `Config` object.
2.  **Scanner** yields `FileItem` objects (metadata only).
3.  **Bundler** collects items, applies priority sorting.
4.  **Bundler** reads file content in batches (IO).
5.  **Processor** reads sample, checks binary, reads full content.
6.  **Processor** transforms content via `Optimizer` OR external command.
7.  **Analyzer** counts tokens of the processed block.
8.  **Formatter** serializes the `FileItem` into a string.
9.  **CLI** writes the string to the output stream.

### Extraction Process

1.  **CLI** reads input stream -> String buffer.
2.  **Formatter** detects format and parses String -> `FileItem[]`.
3.  **Extractor** iterates over `FileItem[]`.
4.  **Extractor** sanitizes path and checks security bounds.
5.  **Extractor** writes content to disk (IO).

## Security Model

The extraction process assumes untrusted input (e.g., generated by an LLM).

*   **Sandbox**: Files are written relative to the current working directory (or specified `--extract-dir`).
*   **Path Traversal**: Paths like `../../etc/passwd` are detected. The system resolves the absolute path of the target and verifies it starts with the absolute path of the extraction root.
*   **Overrides**: The `--unsafe` flag bypasses these checks.