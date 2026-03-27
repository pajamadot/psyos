import { DatabaseSync } from "node:sqlite";

type D1StatementResult<T> = Promise<{ results: T[] }>;

type D1PreparedStatementLike = {
  all<T = Record<string, unknown>>(): D1StatementResult<T>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  bind(...values: unknown[]): D1PreparedStatementLike;
  run(): Promise<{ success: true }>;
};

export class TestD1Database {
  private database = new DatabaseSync(":memory:");

  exec(sql: string) {
    this.database.exec(sql);
  }

  prepare(query: string): D1PreparedStatementLike {
    const statement = this.database.prepare(query);
    let boundValues: unknown[] = [];

    const wrapper: D1PreparedStatementLike = {
      bind(...values: unknown[]) {
        boundValues = values;
        return wrapper;
      },
      async all<T = Record<string, unknown>>() {
        const sqliteValues = boundValues as Parameters<typeof statement.run>;
        return {
          results: statement.all(...sqliteValues) as T[],
        };
      },
      async first<T = Record<string, unknown>>() {
        const sqliteValues = boundValues as Parameters<typeof statement.run>;
        return (statement.get(...sqliteValues) as T | undefined) ?? null;
      },
      async run() {
        const sqliteValues = boundValues as Parameters<typeof statement.run>;
        statement.run(...sqliteValues);
        return { success: true as const };
      },
    };

    return wrapper;
  }

  close() {
    this.database.close();
  }
}
