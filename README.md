# Pg-boss PostgreSQL Testing with pgmock and testcontainers

This project demonstrates and benchmarks several popular approaches and libraries for testing PostgreSQL-backed Node.js code:

- [pgmock](https://github.com/stack-auth/pgmock): An **in-memory PostgreSQL mock server** for fast, isolated tests. Runs entirely in WebAssembly (WASM) with no external dependencies, emulating PostgreSQL for feature parity in tests.
- [@testcontainers/postgresql](https://node.testcontainers.org/modules/postgresql/): Spins up a **real PostgreSQL container** for high-fidelity integration testing.
- [pg-boss](https://github.com/timgit/pg-boss): A robust job queue for PostgreSQL, tested with both backends.

## What does this project do?

- Provides equivalent test suites for both pgmock (WASM-based emulator) and testcontainers (real Postgres), using [vitest](https://vitest.dev/) as the test runner.
- Demonstrates and benchmarks [pg-boss](https://github.com/timgit/pg-boss) integration with both pgmock and testcontainers.
- Compares performance and developer experience between the two approaches.
- Useful for evaluating tradeoffs between speed, realism, and environment parity in Node.js PostgreSQL testing.

## Performance Comparison

Results from a sample run on macOS Sequoia:

| Suite                | Suite-level test time | All tests time |
|----------------------|----------------------|---------------|
| **pgmock**           | ~11.5s               | ~35.7s        |
| **testcontainers**   | ~13.7s               | ~22.3s        |

- **pgmock** is generally faster, especially for isolated/unit tests, due to its in-memory WASM-based nature.
- **testcontainers** is slower (due to container startup/teardown) but provides a real PostgreSQL environment, ideal for high-fidelity integration/E2E tests.
- Both suites include tests for pg-boss job queue functionality.

## How to run

```bash
npm install
npx vitest run
```

## References

- [pgmock](https://github.com/stack-auth/pgmock)
- [@testcontainers/postgresql](https://node.testcontainers.org/modules/postgresql/)
- [pg-boss](https://github.com/timgit/pg-boss)
- [vitest](https://vitest.dev/)