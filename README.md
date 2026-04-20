# ClickHouse MCP Server

一个用于 [ClickHouse](https://clickhouse.com/) 的 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器，让 Claude 等 AI 助手能够直接查询和管理 ClickHouse 数据库。

## 功能

提供 5 个工具：

| 工具 | 描述 |
|------|------|
| `list_databases` | 列出所有数据库 |
| `list_tables` | 列出指定数据库的所有表 |
| `describe_table` | 查看表的列信息和建表语句 |
| `query` | 执行 SELECT 查询，返回 JSON 结果 |
| `execute` | 执行 DDL / DML 语句（CREATE、ALTER、DROP、INSERT 等） |

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 并填写你的 ClickHouse 连接信息：

```bash
cp .env.example .env
```

```env
CLICKHOUSE_HOST=http://your-clickhouse-host:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_password
CLICKHOUSE_DATABASE=default
```

### 构建

```bash
npm run build
```

### 在 Claude Desktop 中使用

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）：

```json
{
  "mcpServers": {
    "clickhouse": {
      "command": "node",
      "args": ["/path/to/clickhouse/dist/index.js"],
      "env": {
        "CLICKHOUSE_HOST": "http://your-clickhouse-host:8123",
        "CLICKHOUSE_USER": "default",
        "CLICKHOUSE_PASSWORD": "your_password",
        "CLICKHOUSE_DATABASE": "default"
      }
    }
  }
}
```

### 在 Claude Code 中使用

```bash
claude mcp add clickhouse node /path/to/clickhouse/dist/index.js \
  -e CLICKHOUSE_HOST=http://your-clickhouse-host:8123 \
  -e CLICKHOUSE_USER=default \
  -e CLICKHOUSE_PASSWORD=your_password \
  -e CLICKHOUSE_DATABASE=default
```

## 开发

```bash
# 直接运行（无需构建）
npm run dev
```

## 技术栈

- [TypeScript](https://www.typescriptlang.org/)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [@clickhouse/client](https://github.com/ClickHouse/clickhouse-js)
- [Zod](https://zod.dev/)

## License

MIT
