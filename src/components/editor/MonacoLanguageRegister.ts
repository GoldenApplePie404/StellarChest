// galgameScript自定义语言Monarch语法注册 - 为Monaco Editor定义token高亮规则
// 对话行/旁白行/指令行/注释行/变量插值{var}/章节标记的token分类和配色主题
// 在ScriptEditor组件的onMount回调中调用registerGalgameLanguage注册

import type * as Monaco from 'monaco-editor';

/** galgameScript语言的Monarch tokenizer规则 */
const galgameTokenizer: Monaco.languages.IMonarchLanguage = {
  // 忽略大小写
  ignoreCase: false,

  // 指令起始标识符列表（@前缀指令）
  keywords: [
    'chapter', 'label', 'jump', 'chapter_end',
    'bg', 'bgm', 'sfx', 'transition',
    'perform', 'pose', 'expression', 'char_flip', 'char_side', 'char_scale', 'char_move', 'char_rotate', 'char_fade',
    'shake', 'flash', 'filter', 'text_color',
    'set', 'input',
    'affection', 'achievement', 'event', 'choice', 'endif',
    'web_bg', 'web_bgm', 'web_sfx', 'web_perform',
    'css_transition', 'char_animate', 'inline_choice', 'timed_choice',
    'click_area', 'autosave', 'load_continue', 'text_speed',
    'wait', 'text_effect', 'if', 'if_show',
    'show_ui', 'hide_ui', 'dialog_style', 'notify',
    'video', 'video_stop',
  ],

  // tokenizer规则定义
  tokenizer: {
    root: [
      // 注释行：以//开头的整行
      [/^\/\/.*$/, 'comment'],

      // 指令行：以@开头的整行
      [/@(\w+)/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'keyword.unknown',
        },
      }],

      // 变量插值：{var_name}格式
      [/\{([^}]+)\}/, 'variable'],

      // 对话行：角色名：对话内容（中文冒号）
      [/^[^@\n\/]+：/, 'dialog.speaker'],

      // 对话行：角色名:对话内容（英文冒号）
      [/^[^@\n\/]+:/, 'dialog.speaker'],

      // 旁白行
      [/^旁白：/, 'narration'],
      [/^旁白:/, 'narration'],
    ],
  },
};

/** galgameScript自定义主题配色 */
const galgameThemeData: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // 指令关键字 - 粉红色
    { token: 'keyword', foreground: 'FF6B9D', fontStyle: 'bold' },
    { token: 'keyword.unknown', foreground: 'FFB4D0', fontStyle: 'italic' },

    // 注释 - 灰色
    { token: 'comment', foreground: '8E8E8E', fontStyle: 'italic' },

    // 变量插值 - 绿色
    { token: 'variable', foreground: '6BCB77', fontStyle: 'underline' },

    // 对话角色名 - 蓝色
    { token: 'dialog.speaker', foreground: '7EC8E3', fontStyle: 'bold' },

    // 旁白行 - 黄色
    { token: 'narration', foreground: 'FFE66D' },

    // 普通文本
    { token: '', foreground: 'FFFFFF' },
  ],
  colors: {
    // 编辑器背景
    'editor.background': '#1E1E28',
    'editor.foreground': '#FFFFFF',
    // 行号
    'editorLineNumber.foreground': '#8E8E8E',
    'editorLineNumber.activeForeground': 'FF6B9D',
    // 选中高亮
    'editor.selectionBackground': '#FF6B9D33',
    'editor.lineHighlightBackground': '#FF6B9D11',
    // 光标
    'editorCursor.foreground': 'FF6B9D',
  },
};

/**
 * 注册galgameScript自定义语言到Monaco Editor
 * @param monaco Monaco Editor全局对象
 */
export function registerGalgameLanguage(monaco: typeof Monaco): void {
  // 注册自定义语言ID
  monaco.languages.register({ id: 'galgameScript' });

  // 设置Monarch tokenizer规则
  monaco.languages.setMonarchTokensProvider('galgameScript', galgameTokenizer);

  // 注册自定义主题
  monaco.editor.defineTheme('galgameTheme', galgameThemeData);

  // 设置语言补全建议（指令快速输入）
  monaco.languages.registerCompletionItemProvider('galgameScript', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // 指令补全建议列表
      const suggestions: Monaco.languages.CompletionItem[] = galgameTokenizer.keywords.map((kw: string) => ({
        label: `@${kw}`,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: `@${kw} `,
        range,
        detail: `galgameScript指令: @${kw}`,
      }));

      return { suggestions };
    },
  });
}

/** 导出tokenizer规则供InstructionReference使用 */
export { galgameTokenizer };
