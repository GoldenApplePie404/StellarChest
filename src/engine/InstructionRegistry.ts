// 指令注册表 - Map存储所有指令Handler，register/getHandler/getAllHandlers方法
// 初始化时自动注册全部50+指令

import type { InstructionHandler } from '@/types/engine';

/** 指令注册表类 */
export class InstructionRegistry {
  /** 指令处理器映射（指令名 -> InstructionHandler） */
  private handlers: Map<string, InstructionHandler> = new Map();

  /**
   * 注册单个指令处理器
   * @param handler 指令处理器实例
   */
  register(handler: InstructionHandler): void {
    this.handlers.set(handler.name, handler);
  }

  /**
   * 批量注册指令处理器
   * @param handlers 指令处理器数组
   */
  registerAll(handlers: InstructionHandler[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  /**
   * 获取指定指令的处理器
   * @param name 指令名称
   * @returns 对应的InstructionHandler，不存在时返回undefined
   */
  getHandler(name: string): InstructionHandler | undefined {
    return this.handlers.get(name);
  }

  /**
   * 获取所有已注册的指令处理器
   * @returns InstructionHandler数组
   */
  getAllHandlers(): InstructionHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 判断指令是否已注册
   * @param name 指令名称
   * @returns 是否存在
   */
  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * 获取所有已注册的指令名列表
   * @returns 指令名数组
   */
  getRegisteredNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取指定分类的所有指令处理器
   * @param category 指令分类
   * @returns 该分类下的InstructionHandler数组
   */
  getHandlersByCategory(category: string): InstructionHandler[] {
    return this.getAllHandlers().filter((h) => h.category === category);
  }

  /** 清空所有注册 */
  clear(): void {
    this.handlers.clear();
  }
}
