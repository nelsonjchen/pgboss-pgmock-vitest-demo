import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresMock } from "pgmock";
import * as pg from "pg";

describe("pgmock demo (suite-level persistence)", () => {
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

describe("pgmock demo (test-level isolation)", () => {
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
      console.log("about to create table");
      await client.query(`
        CREATE TABLE users (
          id INT PRIMARY KEY,
          name TEXT NOT NULL,
          age INT
        )
      `);
      console.log("table created");
      await client.query(`INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`);
      console.log("inserted Alice");
      const allUsers = await client.query("SELECT * FROM users");
      console.log("queried users", allUsers.rows);
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
});