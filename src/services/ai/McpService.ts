// MCP 连接器服务 - 按需连接 MCP 服务器，列出 / 调用工具
// 传输：stdio（command+args+env）/ StreamableHTTP（url，SSE 回退）
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { AIMcpServer } from '@prisma/client';

/** MCP 工具（归一化） */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/** 将 '["a","b"]' 或 'a b' 解析为数组 */
function parseJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  }
}

/** 将 JSON 字符串解析为 env 对象 */
function parseEnv(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** 连接 MCP 服务器（按需，调用方负责关闭） */
async function connect(server: AIMcpServer): Promise<Client> {
  const client = new Client({ name: 'stellar-ai', version: '1.0.0' }, { capabilities: {} });
  if (server.url) {
    const headers = parseEnv(server.env);
    const requestInit = Object.keys(headers).length ? { headers } : undefined;
    try {
      const transport = new StreamableHTTPClientTransport(new URL(server.url), requestInit ? { requestInit } : undefined);
      await client.connect(transport);
    } catch {
      const transport = new SSEClientTransport(new URL(server.url), requestInit ? { requestInit } : undefined);
      await client.connect(transport);
    }
  } else {
    const transport = new StdioClientTransport({
      command: server.command ?? '',
      args: parseJsonArray(server.args),
      env: { ...getDefaultEnvironment(), ...parseEnv(server.env) },
      stderr: 'ignore',
    });
    await client.connect(transport);
  }
  return client;
}

/** 从工具结果 content 提取纯文本 */
function contentToText(content: unknown): string {
  if (!Array.isArray(content)) return typeof content === 'string' ? content : JSON.stringify(content);
  return content
    .map((block) => {
      if (block && typeof block === 'object' && 'type' in block) {
        const b = block as { type: string; text?: string; resource?: unknown };
        if (b.type === 'text') return b.text ?? '';
        if (b.type === 'resource') return typeof b.resource === 'string' ? b.resource : JSON.stringify(b.resource);
      }
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

export const mcpManager = {
  /** 列出服务器工具 */
  async listTools(server: AIMcpServer): Promise<MCPTool[]> {
    const client = await connect(server);
    try {
      const res = await client.listTools();
      return res.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: (t.inputSchema as Record<string, unknown> | undefined) ?? { type: 'object', properties: {} },
      }));
    } finally {
      await client.close().catch(() => undefined);
    }
  },

  /** 调用工具 */
  async callTool(server: AIMcpServer, name: string, args: Record<string, unknown>): Promise<string> {
    const client = await connect(server);
    try {
      const res = await client.callTool({ name, arguments: args });
      const text = contentToText((res as { content?: unknown }).content);
      if (res.isError) return `工具返回错误：${text || name}`;
      return text || '(空结果)';
    } finally {
      await client.close().catch(() => undefined);
    }
  },

  /** 测试连接并返回工具清单 */
  async test(server: AIMcpServer): Promise<{ ok: boolean; tools: MCPTool[]; error?: string }> {
    try {
      const tools = await this.listTools(server);
      return { ok: true, tools };
    } catch (e) {
      return { ok: false, tools: [], error: e instanceof Error ? e.message : String(e) };
    }
  },
};
