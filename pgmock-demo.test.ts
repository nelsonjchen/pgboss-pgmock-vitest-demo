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
});