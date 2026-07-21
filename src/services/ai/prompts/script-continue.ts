// 脚本续写prompt模板
// 构建AI脚本续写的系统提示和用户提示

/** 脚本续写系统提示 */
export function buildScriptContinueSystemPrompt(): string {
  return `你是一个专业的 galgame 脚本续写专家。你需要根据用户提供的脚本片段和续写指令，续写脚本内容。

脚本格式规范：
1. 对话行格式: "角色名: 内容"
2. 旁白行格式: "旁白: 内容"
3. 指令行格式: "@指令名 参数1 参数2 ..."
4. 注释行格式: "// 注释内容"
5. 变量插值: {变量名}

续写要求：
1. 保持与原始脚本片段的风格和格式一致
2. 自然衔接原始片段的最后内容，不要突兀跳转
3. 续写内容应与续写指令描述的方向一致
4. 只输出续写的脚本内容，不要重复原始片段
5. 续写长度适中，通常10-20行对话/旁白+必要的指令行
6. 禁止在脚本中使用任何emoji`;
}

/**
 * 构建脚本续写用户提示
 * @param snippet 原始脚本片段
 * @param instruction 续写指令描述
 * @returns 用户提示文本
 */
export function buildScriptContinueUserPrompt(snippet: string, instruction: string): string {
  return `以下是原始脚本片段：

${snippet}

续写指令：${instruction}

请根据续写指令，在原始脚本片段的基础上续写脚本内容。只输出续写部分，保持格式一致。`;
}
