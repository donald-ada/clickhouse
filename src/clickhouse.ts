import { createClient, ClickHouseClient } from "@clickhouse/client";

let client: ClickHouseClient | null = null;

export function getClient(): ClickHouseClient {
  if (!client) {
    const host = process.env.CLICKHOUSE_HOST;
    const username = process.env.CLICKHOUSE_USER ?? "default";
    const password = process.env.CLICKHOUSE_PASSWORD ?? "";
    const database = process.env.CLICKHOUSE_DATABASE ?? "default";

    if (!host) {
      throw new Error("CLICKHOUSE_HOST environment variable is required");
    }

    client = createClient({ url: host, username, password, database });
  }
  return client;
}

export async function runQuery(
  sql: string,
  database?: string
): Promise<{ rows: unknown[] }> {
  const ch = getClient();
  const result = await ch.query({
    query: sql,
    format: "JSONEachRow",
    ...(database ? { database } : {}),
  });
  const rows = await result.json<unknown[]>();
  return { rows };
}

export async function runCommand(sql: string, database?: string): Promise<void> {
  const ch = getClient();
  await ch.command({
    query: sql,
    ...(database ? { database } : {}),
  });
}
