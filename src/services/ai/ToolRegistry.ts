// 工具注册中心 - 汇总 MCP 服务器 + 内置工具（KB / 提示词 / 联网），归一化为 OpenAI tools
import prisma from '@/lib/db';
import type { OpenAITool } from './OpenAICompatibleProvider';
import { mcpManager, type MCPTool } from './McpService';
import { retrieveChunks, buildContext } from './RagService';
import type { AIAgentToolset } from '@/types/ai';

export interface ToolContext {
  userId: string;
}

export class ToolRegistry {
  tools: OpenAITool[] = [];
  private executors = new Map<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>>();

  static async build(userId: string, toolset: AIAgentToolset): Promise<ToolRegistry> {
    const reg = new ToolRegistry();

    // 1) MCP 服务器工具
    for (const serverId of toolset.mcp) {
      const server = await prisma.aIMcpServer.findFirst({ where: { id: serverId, userId } });
      if (!server) continue;
      let serverTools: MCPTool[] = [];
      try {
        serverTools = await mcpManager.listTools(server);
      } catch {
        continue;
      }
      for (const t of serverTools) {
        const toolName = `mcp__${server.name}__${t.name}`;
        reg.tools.push({
          type: 'function',
          function: { name: toolName, description: t.description ?? `MCP 工具 ${t.name}`, parameters: t.inputSchema ?? { type: 'object', properties: {} } },
        });
        reg.executors.set(toolName, async (args) => mcpManager.callTool(server, t.name, args));
      }
    }

    // 2) 知识库检索工具
    for (const kbId of toolset.kb) {
      const kb = await prisma.aIKnowledgeBase.findFirst({ where: { id: kbId, userId } });
      if (!kb) continue;
      const toolName = `kb_search__${kb.name}`;
      reg.tools.push({
        type: 'function',
        function: {
          name: toolName,
          description: `检索知识库「${kb.name}」的相关内容`,
          parameters: { type: 'object', properties: { query: { type: 'string', description: '检索问题' } }, required: ['query'] },
        },
      });
      reg.executors.set(toolName, async (args) => {
        const chunks = await retrieveChunks(userId, kbId, String(args.query ?? ''), 3);
        const ctxText = buildContext(chunks);
        return ctxText || '（知识库暂无相关内容）';
      });
    }

    // 3) 提示词渲染工具
    for (const pid of toolset.prompts) {
      const p = await prisma.aIPrompt.findFirst({ where: { id: pid, userId } });
      if (!p) continue;
      const toolName = `prompt__${p.title}`;
      reg.tools.push({
        type: 'function',
        function: {
          name: toolName,
          description: `套用提示词模板「${p.title}」`,
          parameters: { type: 'object', properties: { variables: { type: 'object', description: '模板变量名→值' } } },
        },
      });
      reg.executors.set(toolName, async (args) => {
        let content = p.content;
        const vars = (args.variables ?? {}) as Record<string, string>;
        for (const [k, v] of Object.entries(vars)) content = content.split(`{{${k}}}`).join(String(v));
        return content;
      });
    }

    // 4) 联网搜索（占位，需配置搜索 API）
    if (toolset.web) {
      const toolName = 'web_search';
      reg.tools.push({
        type: 'function',
        function: {
          name: toolName,
          description: '联网搜索公开的互联网信息',
          parameters: { type: 'object', properties: { query: { type: 'string', description: '搜索关键词' } }, required: ['query'] },
        },
      });
      reg.executors.set(toolName, async (args) => `（联网搜索暂未接入搜索 API，请在设置中配置后重试：${String(args.query ?? '')}）`);
    }

    return reg;
  }

  async dispatch(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const exec = this.executors.get(name);
    if (!exec) return `未知工具：${name}`;
    try {
      const result = await exec(args ?? {}, ctx);
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (e) {
      return `工具执行失败：${e instanceof Error ? e.message : String(e)}`;
    }
  }
}
