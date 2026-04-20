#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { runQuery, runCommand } from "./clickhouse.js";

const IDENTIFIER_RE = /^[a-zA-Z0-9_]+$/;

function validateIdentifier(name: string, label: string): void {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`Invalid ${label} name: "${name}". Only letters, digits, and underscores are allowed.`);
  }
}

const server = new McpServer(
  { name: "clickhouse", version: "0.1.0" },
  {
    instructions:
      "Use list_databases and list_tables to explore the schema before writing queries. " +
      "Use query for SELECT statements. Use execute for DDL (CREATE/ALTER/DROP) and DML (INSERT/UPDATE/DELETE).",
  }
);

// ─── 1. list_databases ───────────────────────────────────────────────────────

server.registerTool(
  "list_databases",
  {
    description: "List all databases in ClickHouse.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const { rows } = await runQuery("SHOW DATABASES");
    const names = (rows as Array<{ name: string }>).map((r) => r.name);
    return { content: [{ type: "text", text: names.join("\n") }] };
  }
);

// ─── 2. list_tables ──────────────────────────────────────────────────────────

server.registerTool(
  "list_tables",
  {
    description: "List all tables in a database.",
    inputSchema: {
      database: z.string().describe("Database name"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ database }) => {
    validateIdentifier(database, "database");
    const { rows } = await runQuery(`SHOW TABLES FROM \`${database}\``);
    const names = (rows as Array<{ name: string }>).map((r) => r.name);
    return {
      content: [{ type: "text", text: names.length ? names.join("\n") : "(no tables)" }],
    };
  }
);

// ─── 3. describe_table ───────────────────────────────────────────────────────

server.registerTool(
  "describe_table",
  {
    description:
      "Show column names, types, and default expressions for a table. " +
      "Also returns the CREATE TABLE statement for full schema details.",
    inputSchema: {
      database: z.string().describe("Database name"),
      table: z.string().describe("Table name"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ database, table }) => {
    validateIdentifier(database, "database");
    validateIdentifier(table, "table");

    const [descResult, createResult] = await Promise.all([
      runQuery(`DESCRIBE TABLE \`${database}\`.\`${table}\``),
      runQuery(
        `SELECT create_table_query FROM system.tables WHERE database = '${database}' AND name = '${table}'`
      ),
    ]);

    const columns = (
      descResult.rows as Array<{
        name: string;
        type: string;
        default_type: string;
        default_expression: string;
        comment: string;
      }>
    )
      .map((col) => {
        let line = `${col.name}  ${col.type}`;
        if (col.default_expression) line += `  DEFAULT ${col.default_expression}`;
        if (col.comment) line += `  -- ${col.comment}`;
        return line;
      })
      .join("\n");

    const createRows = createResult.rows as Array<{ create_table_query: string }>;
    const createStmt = createRows[0]?.create_table_query ?? "(not found)";

    return {
      content: [
        { type: "text", text: `-- Columns\n${columns}\n\n-- DDL\n${createStmt}` },
      ],
    };
  }
);

// ─── 4. query ────────────────────────────────────────────────────────────────

server.registerTool(
  "query",
  {
    description:
      "Execute a SELECT query and return results as JSON rows. " +
      "Use for read-only operations only. For DDL or DML use execute instead.",
    inputSchema: {
      sql: z.string().describe("SELECT SQL statement"),
      database: z.string().optional().describe("Database context (optional)"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ sql, database }) => {
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT") && !trimmed.startsWith("WITH") && !trimmed.startsWith("SHOW") && !trimmed.startsWith("EXPLAIN")) {
      throw new Error("query tool only accepts SELECT/WITH/SHOW/EXPLAIN. Use execute for DDL/DML.");
    }
    const { rows } = await runQuery(sql, database);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  }
);

// ─── 5. execute ──────────────────────────────────────────────────────────────

server.registerTool(
  "execute",
  {
    description:
      "Execute a DDL or DML statement: CREATE TABLE, ALTER TABLE, DROP TABLE, INSERT, UPDATE, DELETE. " +
      "Returns success/error only — no row results. Use query for SELECT.",
    inputSchema: {
      sql: z.string().describe("DDL or DML SQL statement"),
      database: z.string().optional().describe("Database context (optional)"),
    },
    annotations: { destructiveHint: true },
  },
  async ({ sql, database }) => {
    await runCommand(sql, database);
    return {
      content: [{ type: "text", text: "OK" }],
    };
  }
);

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
