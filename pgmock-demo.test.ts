import { describe, it, expect, beforeAll, afterAll, test } from "vitest";
import PgBoss from "pg-boss";
import { PostgresMock } from "pgmock";
import * as pg from "pg";

/**
 * WARNING: Suite-level persistence (sharing a single PostgresMock instance across tests)
 * is NOT safe for parallel test execution. Tests may interfere with each other,
 * causing race conditions and flaky results. For parallel-safe tests, always use
 * a fresh PostgresMock instance per test.
 */

describe("pgmock demo (suite-level persistence, NOT parallel-safe)", () => {
  let mock: PostgresMock;
  let client: pg.Client;

  beforeAll(async () => {
    mock = await PostgresMock.create();
    client = new pg.Client(mock.getNodePostgresConfig());
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    mock.destroy();
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

  it("should create tables, insert, query, and aggregate (simplified)", async () => {
    await client.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name TEXT NOT NULL,
        age INT
      )
    `);

    await client.query(`INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`);
    await client.query(`INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)`);
    await client.query(`INSERT INTO users (id, name, age) VALUES (3, 'Charlie', 35)`);

    const allUsers = await client.query(`SELECT * FROM users ORDER BY id`);
    expect(allUsers.rows.length).toBe(3);
    expect(allUsers.rows[0].name).toBe('Alice');
    expect(allUsers.rows[1].name).toBe('Bob');
    expect(allUsers.rows[2].name).toBe('Charlie');

    const avgAge = await client.query(`SELECT AVG(age) as avg_age FROM users`);
    expect(Number(avgAge.rows[0].avg_age)).toBeCloseTo(30);

    const over30 = await client.query(`SELECT name FROM users WHERE age > 30`);
    expect(over30.rows.length).toBe(1);
    expect(over30.rows[0].name).toBe('Charlie');
  }, 20000);

  it("should have users table after previous test (suite-level persistence)", async () => {
    // This will pass, showing persistence within the suite
    const allUsers = await client.query("SELECT * FROM users");
    expect(allUsers.rows.length).toBe(3);
  });
});

describe("pgmock demo (test-level isolation, parallel-safe)", () => {
  async function withMockClient(fn: (client: pg.Client) => Promise<void>) {
    const mock = await PostgresMock.create();
    const client = new pg.Client(mock.getNodePostgresConfig());
    await client.connect();
    try {
      await fn(client);
    } finally {
      await client.end();
      mock.destroy();
    }
  }

  it("should not have users table in a fresh mock", async () => {
    await withMockClient(async (client) => {
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

  it("should create table and see data only in this test", async () => {
    await withMockClient(async (client) => {
      await client.query(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name TEXT NOT NULL,
          age INT
        )
      `);
      await client.query(`INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`);
      const allUsers = await client.query("SELECT * FROM users");
      expect(allUsers.rows.length).toBe(1);
    });
  }, 20000);

  it("should not have users table in a new test (fresh mock)", async () => {
    await withMockClient(async (client) => {
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

  // Demonstrate parallel/concurrent test safety
  test.concurrent("concurrent: create and query users table", async () => {
    await withMockClient(async (client) => {
      await client.query(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name TEXT NOT NULL,
          age INT
        )
      `);
      await client.query(`INSERT INTO users (id, name, age) VALUES (1, 'Concurrent', 99)`);
      const allUsers = await client.query("SELECT * FROM users");
      expect(allUsers.rows.length).toBe(1);
      expect(allUsers.rows[0].name).toBe('Concurrent');
    });
  }, 20000);

  test.concurrent("concurrent: users table does not exist in another test", async () => {
    await withMockClient(async (client) => {
      let errorCaught = false;

describe("pg-boss with pgmock integration", () => {
  async function withMockClientAndBoss(fn: (boss: PgBoss) => Promise<void>) {
    const mock = await PostgresMock.create();
    const config = mock.getNodePostgresConfig();
    // pg-boss expects a connection string, so we build one
    // pgmock config does not provide a database name, so we use 'postgres'
    const connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/postgres`;
    const boss = new PgBoss({ connectionString });
    try {
      await boss.start();
      await fn(boss);
    } finally {
      await boss.stop();
      mock.destroy();
    }
  }

  it("should enqueue and fetch a job", async () => {
    await withMockClientAndBoss(async (boss) => {
      const jobId = await boss.send("demo-job", { hello: "world" });
      expect(jobId).toBeTruthy();
      const jobs = await boss.fetch("demo-job");
      // If pg-boss works, we should get our job back
      expect(jobs).toBeTruthy();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      const job = jobs[0];
      expect(job.data).toEqual({ hello: "world" });
      // Complete the job (id, data, and state are required)
      await boss.complete("demo-job", job.id);
    });
  }, 20000);
});
      try {
        await client.query("SELECT * FROM users");
      } catch (err: any) {
        errorCaught = true;
        expect(err.message).toMatch(/relation.*does not exist/i);
      }
      expect(errorCaught).toBe(true);
    });
  });
});