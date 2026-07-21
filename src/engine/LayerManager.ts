// 分层渲染管理器 - 浏览器端渲染管理，操作DOM/Canvas元素
// 背景层Canvas + 立绘层Canvas + 对话框DOM + UI控制DOM
// renderBackground切换背景、renderCharacter显示立绘、showDialog显示对话框
// showChoice显示选择面板、applyEffect应用屏幕特效、notify通知条

import type { LayerManagerActions, CharacterDisplayState, ChoiceOption, UIPanelType } from '@/types/engine';
import type { NotificationType, NotificationParams, ScreenEffect } from './types';

/** 分层渲染管理器类（浏览器端） */
export class LayerManager implements LayerManagerActions {
  /** 背景层Canvas元素 */
  private bgCanvas: HTMLCanvasElement | null = null;
  /** 背景层Canvas 2D上下文 */
  private bgCtx: CanvasRenderingContext2D | null = null;
  /** 立绘层Canvas元素 */
  private charCanvas: HTMLCanvasElement | null = null;
  /** 立绘层Canvas 2D上下文 */
  private charCtx: CanvasRenderingContext2D | null = null;
  /** 对话框DOM容器 */
  private dialogContainer: HTMLElement | null = null;
  /** UI面板DOM容器 */
  private uiContainer: HTMLElement | null = null;
  /** 已加载的图片缓存（url -> HTMLImageElement） */
  private imageCache: Map<string, HTMLImageElement> = new Map();
  /** 当前显示的角色立绘数据 */
  private displayedCharacters: Map<string, { img: HTMLImageElement; state: CharacterDisplayState }> = new Map();
  /** 当前BGM音频元素 */
  private bgmAudio: HTMLAudioElement | null = null;
  /** 通知回调 */
  private onNotify: ((params: NotificationParams) => void) | null = null;
  /** 对话框更新回调 */
  private onDialogUpdate: ((speaker: string, text: string, style?: string) => void) | null = null;
  /** 选择面板更新回调 */
  private onChoiceUpdate: ((options: ChoiceOption[]) => void) | null = null;
  /** UI面板更新回调 */
  private onUIUpdate: ((panel: UIPanelType, action: 'show' | 'hide' | 'hideAll') => void) | null = null;
  /** 背景切换回调 */
  private onBackgroundChange: ((resource: string) => void) | null = null;
  /** BGM切换回调 */
  private onBgmChange: ((resource: string) => void) | null = null;
  /** 震屏动画状态 */
  private shakeAnimation: { active: boolean; strength: number; duration: number } = { active: false, strength: 0, duration: 0 };
  /** 闪屏动画状态 */
  private flashAnimation: { active: boolean; color: string; duration: number } = { active: false, color: '#FFFFFF', duration: 300 };

  /**
   * 初始化渲染管理器（绑定Canvas和DOM元素）
   * @param bgCanvas 背景层Canvas元素
   * @param charCanvas 立绘层Canvas元素
   * @param dialogContainer 对话框DOM容器
   * @param uiContainer UI面板DOM容器
   */
  init(
    bgCanvas: HTMLCanvasElement,
    charCanvas: HTMLCanvasElement,
    dialogContainer: HTMLElement,
    uiContainer: HTMLElement,
  ): void {
    this.bgCanvas = bgCanvas;
    this.bgCtx = bgCanvas.getContext('2d');
    this.charCanvas = charCanvas;
    this.charCtx = charCanvas.getContext('2d');
    this.dialogContainer = dialogContainer;
    this.uiContainer = uiContainer;
  }

  /**
   * 注册通知回调
   * @param callback 回调函数
   */
  setNotifyCallback(callback: (params: NotificationParams) => void): void {
    this.onNotify = callback;
  }

  /**
   * 注册对话框更新回调
   * @param callback 回调函数
   */
  setDialogCallback(callback: (speaker: string, text: string, style?: string) => void): void {
    this.onDialogUpdate = callback;
  }

  /**
   * 注册选择面板更新回调
   * @param callback 回调函数
   */
  setChoiceCallback(callback: (options: ChoiceOption[]) => void): void {
    this.onChoiceUpdate = callback;
  }

  /**
   * 注册UI面板更新回调
   * @param callback 回调函数
   */
  setUICallback(callback: (panel: UIPanelType, action: 'show' | 'hide' | 'hideAll') => void): void {
    this.onUIUpdate = callback;
  }

  /**
   * 注册背景切换回调
   * @param callback 回调函数
   */
  setBackgroundCallback(callback: (resource: string) => void): void {
    this.onBackgroundChange = callback;
  }

  /**
   * 注册BGM切换回调
   * @param callback 回调函数
   */
  setBgmCallback(callback: (resource: string) => void): void {
    this.onBgmChange = callback;
  }

  /**
   * 渲染背景图片
   * @param resource 背景资源路径/URL
   * @param transition 过渡效果（fade/slide等）
   */
  renderBackground(resource: string, transition?: string): void {
    if (!this.bgCtx || !this.bgCanvas) return;
    this.onBackgroundChange?.(resource);

    const img = this.loadImage(resource);
    img.onload = () => {
      const ctx = this.bgCtx!;
      const canvas = this.bgCanvas!;
      const cw = canvas.width;
      const ch = canvas.height;

      if (transition === 'fade') {
        // 淡入过渡：先绘制半透明新背景，再用requestAnimationFrame逐步增加透明度
        this.fadeTransition(ctx, img, cw, ch);
      } else if (transition === 'slide') {
        // 滑动过渡：新背景从右侧滑入
        this.slideTransition(ctx, img, cw, ch);
      } else {
        // 直接绘制（无过渡）
        ctx.clearRect(0, 0, cw, ch);
        this.drawImageCover(ctx, img, cw, ch);
      }
    };

    // 如果图片已缓存且已加载，直接绘制
    if (img.complete && img.naturalWidth > 0) {
      const ctx = this.bgCtx!;
      const canvas = this.bgCanvas!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.drawImageCover(ctx, img, canvas.width, canvas.height);
    }
  }

  /**
   * 渲染角色立绘
   * @param charId 角色ID
   * @param state 角色显示状态
   */
  renderCharacter(charId: string, state: CharacterDisplayState): void {
    if (!this.charCtx || !this.charCanvas) return;

    // 加载立绘图片
    const img = this.loadImage(state.spriteUrl);
    this.displayedCharacters.set(charId, { img, state });

    img.onload = () => {
      this.redrawAllCharacters();
    };

    // 图片已缓存时直接绘制
    if (img.complete && img.naturalWidth > 0) {
      this.redrawAllCharacters();
    }
  }

  /** 重绘所有角色立绘（避免全量重绘，增量更新） */
  private redrawAllCharacters(): void {
    if (!this.charCtx || !this.charCanvas) return;

    const ctx = this.charCtx!;
    const canvas = this.charCanvas!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.displayedCharacters.forEach(({ img, state }) => {
      if (!img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // 计算立绘位置和尺寸
      const positionX = this.calculateCharX(state.position, cw, img.naturalWidth * state.scale);
      const positionY = ch - img.naturalHeight * state.scale; // 底部对齐

      ctx.save();

      // 透明度
      ctx.globalAlpha = state.opacity;

      // 翻转
      if (state.flipped) {
        ctx.translate(positionX + img.naturalWidth * state.scale / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(positionX + img.naturalWidth * state.scale / 2), 0);
      }

      // 旋转
      if (state.rotation !== 0) {
        const centerX = positionX + img.naturalWidth * state.scale / 2;
        const centerY = positionY + img.naturalHeight * state.scale / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(state.rotation * Math.PI / 180);
        ctx.translate(-centerX, -centerY);
      }

      // 缩放并绘制
      const drawWidth = img.naturalWidth * state.scale;
      const drawHeight = img.naturalHeight * state.scale;
      ctx.drawImage(img, positionX, positionY, drawWidth, drawHeight);

      ctx.restore();
    });
  }

  /** 计算角色X坐标（基于位置参数） */
  private calculateCharX(position: string, canvasWidth: number, charWidth: number): number {
    switch (position) {
      case 'left':
        return canvasWidth * 0.05;
      case 'right':
        return canvasWidth * 0.95 - charWidth;
      case 'center':
        return (canvasWidth - charWidth) / 2;
      default:
        return (canvasWidth - charWidth) / 2;
    }
  }

  /**
   * 显示对话框
   * @param speaker 角色名
   * @param text 对话文本
   * @param style 对话框样式
   */
  showDialog(speaker: string, text: string, style?: string): void {
    if (this.onDialogUpdate) {
      this.onDialogUpdate(speaker, text, style);
    }
  }

  /**
   * 显示选择面板
   * @param options 选项列表
   */
  showChoice(options: ChoiceOption[]): void {
    if (this.onChoiceUpdate) {
      this.onChoiceUpdate(options);
    }
  }

  /**
   * 显示UI面板
   * @param panel 面板类型
   */
  showUI(panel: UIPanelType): void {
    if (this.onUIUpdate) {
      this.onUIUpdate(panel, 'show');
    }
  }

  /**
   * 隐藏UI面板
   * @param panel 面板类型或'all'
   */
  hideUI(panel: UIPanelType | 'all'): void {
    if (this.onUIUpdate) {
      if (panel === 'all') {
        this.onUIUpdate('menu', 'hideAll');
      } else {
        this.onUIUpdate(panel, 'hide');
      }
    }
  }

  /**
   * 震屏特效
   * @param strength 震动强度（像素）
   * @param duration 持续时间（毫秒）
   */
  shakeScreen(strength: number = 10, duration: number = 500): void {
    this.shakeAnimation = { active: true, strength, duration };
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      if (elapsed >= duration) {
        this.shakeAnimation.active = false;
        // 恢复原位
        if (this.charCanvas) {
          this.charCanvas.style.transform = '';
        }
        return;
      }

      // 随机偏移
      const offsetX = (Math.random() - 0.5) * 2 * strength;
      const offsetY = (Math.random() - 0.5) * 2 * strength;
      if (this.charCanvas) {
        this.charCanvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  /**
   * 闪屏特效
   * @param color 闪光颜色
   * @param duration 持续时间（毫秒）
   */
  flashScreen(color: string = '#FFFFFF', duration: number = 300): void {
    // 创建临时闪屏元素
    const flashDiv = document.createElement('div');
    flashDiv.style.position = 'fixed';
    flashDiv.style.top = '0';
    flashDiv.style.left = '0';
    flashDiv.style.width = '100%';
    flashDiv.style.height = '100%';
    flashDiv.style.backgroundColor = color;
    flashDiv.style.opacity = '0.8';
    flashDiv.style.zIndex = '1000';
    flashDiv.style.transition = `opacity ${duration}ms ease-out`;
    document.body.appendChild(flashDiv);

    // 渐变消失
    requestAnimationFrame(() => {
      flashDiv.style.opacity = '0';
    });

    setTimeout(() => {
      document.body.removeChild(flashDiv);
    }, duration + 50);
  }

  /**
   * 应用滤镜特效
   * @param preset 滤镜预设（blur/grayscale/sepia/invert/brightness/contrast/hue-rotate/saturate/vignette）
   * @param intensity 强度（0-1）
   * @param vignette 暗角强度（0-1）
   */
  applyFilter(preset: string, intensity: number = 1, vignette: number = 0): void {
    if (!this.bgCanvas) return;

    // CSS滤镜应用于Canvas
    const filterMap: Record<string, string> = {
      blur: `blur(${intensity * 5}px)`,
      grayscale: `grayscale(${intensity * 100}%)`,
      sepia: `sepia(${intensity * 100}%)`,
      invert: `invert(${intensity * 100}%)`,
      brightness: `brightness(${1 + intensity * 0.5})`,
      contrast: `contrast(${1 + intensity * 0.5})`,
      hue_rotate: `hue-rotate(${intensity * 180}deg)`,
      saturate: `saturate(${1 + intensity * 2})`,
    };

    const filterValue = filterMap[preset] || '';
    this.bgCanvas.style.filter = filterValue;

    // 暗角效果（通过CSS box-shadow的inset实现）
    if (vignette > 0) {
      const vStr = `inset 0 0 ${vignette * 200}px ${vignette * 100}px rgba(0,0,0,${vignette * 0.6})`;
      this.bgCanvas.style.boxShadow = vStr;
    } else {
      this.bgCanvas.style.boxShadow = '';
    }
  }

  /**
   * 显示通知条
   * @param text 通知文本
   * @param duration 显示时长（毫秒，默认3000）
   */
  showNotification(text: string, duration: number = 3000): void {
    if (this.onNotify) {
      this.onNotify({ text, type: 'info', duration });
    }
  }

  /**
   * 播放BGM
   * @param resource BGM资源路径/URL
   */
  playBGM(resource: string): void {
    // 停止当前BGM
    this.stopBGM();

    this.bgmAudio = new Audio(resource);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.5;
    this.onBgmChange?.(resource);
    this.bgmAudio.play().catch(() => {
      // 自动播放可能被浏览器阻止，静默处理
    });
  }

  /**
   * 播放SFX
   * @param resource SFX资源路径/URL
   */
  playSFX(resource: string): void {
    const sfxAudio = new Audio(resource);
    sfxAudio.loop = false;
    sfxAudio.volume = 0.7;
    sfxAudio.play().catch(() => {
      // 播放失败静默处理
    });
  }

  /**
   * 停止BGM
   */
  stopBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
  }

  /** 清除所有滤镜 */
  clearFilter(): void {
    if (this.bgCanvas) {
      this.bgCanvas.style.filter = '';
      this.bgCanvas.style.boxShadow = '';
    }
  }

  /** 清除所有角色立绘 */
  clearCharacters(): void {
    this.displayedCharacters.clear();
    if (this.charCtx && this.charCanvas) {
      this.charCtx.clearRect(0, 0, this.charCanvas.width, this.charCanvas.height);
    }
  }

  /** 移除指定角色立绘 */
  removeCharacter(charId: string): void {
    this.displayedCharacters.delete(charId);
    this.redrawAllCharacters();
  }

  /** 加载图片（带缓存） */
  private loadImage(url: string): HTMLImageElement {
    const cached = this.imageCache.get(url);
    if (cached) return cached;

    const img = new Image();
    // 同域静态资源无需 crossOrigin；跨域资源需要服务器返回 CORS 头时才应设置
    img.src = url;
    this.imageCache.set(url, img);
    return img;
  }

  /** 以Cover模式绘制图片（填满Canvas区域，居中裁剪） */
  private drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvasWidth: number, canvasHeight: number): void {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imgRatio > canvasRatio) {
      // 图片更宽，以高度为准填满
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    } else {
      // 图片更高，以宽度为准填满
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  /** 淡入过渡动画 */
  private fadeTransition(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number): void {
    let alpha = 0;
    const step = 0.02;
    const animate = () => {
      alpha += step;
      if (alpha > 1) alpha = 1;

      ctx.clearRect(0, 0, cw, ch);
      ctx.globalAlpha = alpha;
      this.drawImageCover(ctx, img, cw, ch);
      ctx.globalAlpha = 1;

      if (alpha < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /** 滑动过渡动画 */
  private slideTransition(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number): void {
    let offset = cw;
    const speed = cw / 30; // 30帧完成过渡

    const animate = () => {
      offset -= speed;
      if (offset < 0) offset = 0;

      ctx.clearRect(0, 0, cw, ch);
      this.drawImageCover(ctx, img, cw, ch);

      if (offset > 0) {
        // 遮罩未到达的部分
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, offset, ch);
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /** 获取当前显示的角色列表 */
  getDisplayedCharacterIds(): string[] {
    return Array.from(this.displayedCharacters.keys());
  }
}
