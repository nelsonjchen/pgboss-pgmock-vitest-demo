import { describe, it, expect, beforeAll, afterAll, test } from "vitest";
import { StartedTestContainer } from "testcontainers";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import * as pg from "pg";

/**
 * WARNING: Suite-level persistence (sharing a single Postgres container across tests)
 * is NOT safe for parallel test execution. Tests may interfere with each other,
 * causing race conditions and flaky results. For parallel-safe tests, always use
 * a fresh container per test.
 */

describe("testcontainers demo (suite-level persistence, NOT parallel-safe)", () => {
  let container: any;
  let client: pg.Client;
  let startTime: number;
  let endTime: number;

  beforeAll(async () => {
    startTime = Date.now();
    container = await new PostgreSqlContainer().start();
    client = new pg.Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await container.stop();
    endTime = Date.now();
    // eslint-disable-next-line no-console
    console.log(
      `[testcontainers suite-level] Total time: ${(endTime - startTime) / 1000}s`
    );
  });

  it("should not have users table before creation", async () => {
    let errorCaught = false;
    try {
      await client.query("SELECT * FROM users");
    } catch (err: any) {
      errorCaught = true;
      expect(err.message).toMatch(/relation.*does not exist/i);
    }
    expect(errorCaught).toBe(true);
  });

  it(
    "should create tables, insert, query, and aggregate (simplified)",
    async () => {
      await client.query(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name TEXT NOT NULL,
          age INT
        )
      `);

      await client.query(
        `INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`
      );
      await client.query(
        `INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)`
      );
      await client.query(
        `INSERT INTO users (id, name, age) VALUES (3, 'Charlie', 35)`
      );

      const allUsers = await client.query(`SELECT * FROM users ORDER BY id`);
      expect(allUsers.rows.length).toBe(3);
      expect(allUsers.rows[0].name).toBe("Alice");
      expect(allUsers.rows[1].name).toBe("Bob");
      expect(allUsers.rows[2].name).toBe("Charlie");

      const avgAge = await client.query(
        `SELECT AVG(age) as avg_age FROM users`
      );
      expect(Number(avgAge.rows[0].avg_age)).toBeCloseTo(30);

      const over30 = await client.query(
        `SELECT name FROM users WHERE age > 30`
      );
      expect(over30.rows.length).toBe(1);
      expect(over30.rows[0].name).toBe("Charlie");
    },
    30000
  );

  it("should have users table after previous test (suite-level persistence)", async () => {
    const allUsers = await client.query("SELECT * FROM users");
    expect(allUsers.rows.length).toBe(3);
  });
});

describe("testcontainers demo (test-level isolation, parallel-safe)", () => {
  async function withContainerClient(
    fn: (client: pg.Client) => Promise<void>
  ) {
    const container = await new PostgreSqlContainer().start();
    const client = new pg.Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();
    try {
      await fn(client);
    } finally {
      await client.end();
      await container.stop();
    }
  }

  it("should not have users table in a fresh container", async () => {
    await withContainerClient(async (client) => {
      let errorCaught = false;
      try {
        await client.query("SELECT * FROM users");
      } catch (err: any) {
        errorCaught = true;
        expect(err.message).toMatch(/relation.*does not exist/i);
      }
      expect(errorCaught).toBe(true);
    });
  });

  it(
    "should create table and see data only in this test",
    async () => {
      await withContainerClient(async (client) => {
        await client.query(`
          CREATE TABLE users (
            id INT PRIMARY KEY,
            name TEXT NOT NULL,
            age INT
          )
        `);
        await client.query(
          `INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`
        );
        const allUsers = await client.query("SELECT * FROM users");
        expect(allUsers.rows.length).toBe(1);
      });
    },
    30000
  );

  it("should not have users table in a new test (fresh container)", async () => {
    await withContainerClient(async (client) => {
      let errorCaught = false;
      try {
        await client.query("SELECT * FROM users");
      } catch (err: any) {
        errorCaught = true;
        expect(err.message).toMatch(/relation.*does not exist/i);
      }
      expect(errorCaught).toBe(true);
    });
  });

  test.concurrent(
    "concurrent: create and query users table",
    async () => {
      await withContainerClient(async (client) => {
        await client.query(`
          CREATE TABLE users (
            id INT PRIMARY KEY,
            name TEXT NOT NULL,
            age INT
          )
        `);
        await client.query(
          `INSERT INTO users (id, name, age) VALUES (1, 'Concurrent', 99)`
        );
        const allUsers = await client.query("SELECT * FROM users");
        expect(allUsers.rows.length).toBe(1);
        expect(allUsers.rows[0].name).toBe("Concurrent");
      });
    },
    30000
  );

  test.concurrent(
    "concurrent: users table does not exist in another test",
    async () => {
      await withContainerClient(async (client) => {
        let errorCaught = false;
        try {
          await client.query("SELECT * FROM users");
        } catch (err: any) {
          errorCaught = true;
          expect(err.message).toMatch(/relation.*does not exist/i);
        }
        expect(errorCaught).toBe(true);
      });
    }
  );
});