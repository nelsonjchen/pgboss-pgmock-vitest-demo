import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresMock } from "pgmock";
import * as pg from "pg";

describe("pgmock demo", () => {
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

  it("should query the mock database", async () => {
    const result = await client.query('SELECT $1::text as message', ['Hello world!']);
    expect(result.rows[0].message).toBe('Hello world!');
  });

  it("should create tables, insert, query, and aggregate (simplified)", async () => {
    // Create a users table (no SERIAL, no DEFAULT)
    await client.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name TEXT NOT NULL,
        age INT
      )
    `);

    // Insert users one at a time
    await client.query(`INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)`);
    await client.query(`INSERT INTO users (id, name, age) VALUES (2, 'Bob', 25)`);
    await client.query(`INSERT INTO users (id, name, age) VALUES (3, 'Charlie', 35)`);

    // Query all users
    const allUsers = await client.query(`SELECT * FROM users ORDER BY id`);
    console.log("allUsers", allUsers.rows);
    expect(allUsers.rows.length).toBe(3);
    expect(allUsers.rows[0].name).toBe('Alice');
    expect(allUsers.rows[1].name).toBe('Bob');
    expect(allUsers.rows[2].name).toBe('Charlie');

    // Aggregate: average age
    const avgAge = await client.query(`SELECT AVG(age) as avg_age FROM users`);
    console.log("avgAge", avgAge.rows);
    expect(Number(avgAge.rows[0].avg_age)).toBeCloseTo(30);

    // Query with condition
    const over30 = await client.query(`SELECT name FROM users WHERE age > 30`);
    console.log("over30", over30.rows);
    expect(over30.rows.length).toBe(1);
    expect(over30.rows[0].name).toBe('Charlie');
  }, 20000); // Set timeout to 20s
});