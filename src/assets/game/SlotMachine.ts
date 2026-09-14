import {
  Application,
  Assets,
  Container,
  FillGradient,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
} from "pixi.js";

import type { SpinResult, SymbolType } from "../gamelogic";

import cherryIcon from "./symbols/cherry.svg";
import lemonIcon from "./symbols/lemon.svg";
import starIcon from "./symbols/star.svg";

const SYMBOL_ICON_URLS: Record<SymbolType, string> = {
  "🍒": cherryIcon,
  "🍋": lemonIcon,
  "⭐": starIcon,
};

export class SlotMachine {
  private app: Application | null = null;
  private root: Container | null = null;

  private reels: Container[] = [];
  private reelSymbols: Sprite[][] = [];
  private reelPositions: number[] = [];

  private symbolTextures: Record<SymbolType, Texture> | null = null;
  private paylineGlow: Graphics | null = null;

  private readonly symbolHeight = 85;
  private readonly symbolSize = 76;
  private spinning = false;

  private resizeObserver: ResizeObserver | null = null;

  // Controle de ciclo de vida para o React StrictMode.
  private initialized = false;
  private destroyRequested = false;

  private readonly colors = {
    background: 0x0b0d10,
    text: 0xf7ecd2,
    muted: 0xc9b587,
    win: 0x8fe0ad,
  };

  private readonly symbols: SymbolType[] = ["🍒", "🍋", "⭐"];

  async initialize(container: HTMLElement) {
    this.destroyRequested = false;
    this.initialized = false;

    const app = new Application();
    this.app = app;

    await app.init({
      resizeTo: container,
      background: this.colors.background,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Se o React pediu destroy enquanto o Pixi estava inicializando,
    // agora que app.init terminou podemos destruir com segurança.
    if (this.destroyRequested) {
      app.destroy({ removeView: true });
      this.app = null;
      this.destroyRequested = false;
      return;
    }

    if (!this.symbolTextures) {
      const entries = Object.entries(SYMBOL_ICON_URLS) as [
        SymbolType,
        string,
      ][];

      const loaded = await Promise.all(
        entries.map(([, url]) => Assets.load<Texture>(url))
      );

      if (this.destroyRequested) {
        app.destroy({ removeView: true });
        this.app = null;
        this.destroyRequested = false;
        return;
      }

      this.symbolTextures = entries.reduce(
        (map, [symbol], index) => {
          map[symbol] = loaded[index];
          return map;
        },
        {} as Record<SymbolType, Texture>
      );
    }

    container.appendChild(app.canvas);

    this.root = new Container();
    app.stage.addChild(this.root);

    this.createMachine();

    this.resizeObserver = new ResizeObserver(() => {
      this.layout();
    });

    this.resizeObserver.observe(container);

    this.layout();
    this.initialized = true;
  }

  private createMachine() {
    if (!this.root || !this.symbolTextures) return;

    const goldRing = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      colorStops: [
        { offset: 0, color: 0xfbe6a8 },
        { offset: 0.5, color: 0xc99a3f },
        { offset: 1, color: 0x7a5518 },
      ],
    });

    const cabinetFill = new FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.35 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.35 },
      outerRadius: 0.85,
      colorStops: [
        { offset: 0, color: 0x1c2620 },
        { offset: 0.6, color: 0x11151a },
        { offset: 1, color: 0x05070a },
      ],
    });

    const marqueeFill = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0xecc873 },
        { offset: 0.5, color: 0xb98a34 },
        { offset: 1, color: 0x7a5518 },
      ],
    });

    const reelWindowFill = new FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.9,
      colorStops: [
        { offset: 0, color: 0x161b21 },
        { offset: 1, color: 0x05070a },
      ],
    });

    // GABINETE
    const machine = new Graphics();

    machine.roundRect(0, 0, 700, 410, 20);
    machine.fill(cabinetFill);

    machine.stroke({
      fill: goldRing,
      width: 4,
    });

    this.root.addChild(machine);

    const bevel = new Graphics();

    bevel.roundRect(6, 6, 688, 398, 16);
    bevel.stroke({ color: 0x000000, alpha: 0.4, width: 1.5 });

    this.root.addChild(bevel);

    // BARRA SUPERIOR (marquise)
    const topBar = new Graphics();

    topBar.roundRect(18, 18, 664, 55, 10);
    topBar.fill(marqueeFill);

    topBar.stroke({
      color: 0x5a3f14,
      width: 1.5,
      alpha: 0.6,
    });

    this.root.addChild(topBar);

    // LÂMPADAS DA MARQUISE
    const bulbCount = 18;
    const bulbMargin = 32;
    const bulbSpan = 664 - bulbMargin * 2;

    for (let i = 0; i < bulbCount; i++) {
      const bulb = new Graphics();
      const bx = 18 + bulbMargin + (bulbSpan / (bulbCount - 1)) * i;

      bulb.circle(bx, 20, 2.6);
      bulb.fill({ color: 0xfff3cf, alpha: 0.95 });

      this.root.addChild(bulb);
    }

    // TÍTULO
    const titleStyle = new TextStyle({
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: 19,
      fontWeight: "700",
      fill: 0x241a0e,
      letterSpacing: 0.5,
    });

    const title = new Text({
      text: "LUCKY JUNGLE",
      style: titleStyle,
    });

    title.x = 38;
    title.y = 32;

    this.root.addChild(title);

    // SUBTÍTULO
    const subtitleStyle = new TextStyle({
      fontFamily: "Arial, sans-serif",
      fontSize: 9,
      fontWeight: "700",
      fill: 0x4a3712,
      letterSpacing: 1.5,
    });

    const subtitle = new Text({
      text: "CLASSIC REELS",
      style: subtitleStyle,
    });

    subtitle.x = 38;
    subtitle.y = 54;

    this.root.addChild(subtitle);

    // ÁREA DOS REELS
    const reelArea = new Graphics();

    reelArea.roundRect(38, 91, 624, 278, 12);
    reelArea.fill(reelWindowFill);

    reelArea.stroke({
      fill: goldRing,
      width: 2,
      alpha: 0.55,
    });

    this.root.addChild(reelArea);

    // LINHA CENTRAL (payline) com brilho
    // A área dos reels vai de 91 até 369. O centro exato é 230.
    const paylineGlowFill = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: 0xecc873 },
        { offset: 0.5, color: 0xfff3cf },
        { offset: 1, color: 0xecc873 },
      ],
    });

    const paylineGlow = new Graphics();

    paylineGlow.rect(40, 224, 620, 12);
    paylineGlow.fill({ fill: paylineGlowFill, alpha: 0.35 });

    this.root.addChild(paylineGlow);
    this.paylineGlow = paylineGlow;

    const centerLine = new Graphics();

    centerLine.rect(40, 229, 620, 2);
    centerLine.fill({ color: 0xfff3cf, alpha: 0.8 });

    this.root.addChild(centerLine);

    // REELS
    const reelWidth = 180;
    const gap = 30;
    const startX = 47;
    const startY = 100;

    for (let i = 0; i < 3; i++) {
      const reel = new Container();

      reel.x = startX + i * (reelWidth + gap);
      reel.y = startY;

      // FUNDO
      const reelBgFill = new FillGradient({
        type: "linear",
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
        colorStops: [
          { offset: 0, color: 0x1a2028 },
          { offset: 1, color: 0x07090c },
        ],
      });

      const reelBackground = new Graphics();

      reelBackground.roundRect(0, 0, reelWidth, 260, 10);
      reelBackground.fill(reelBgFill);

      reelBackground.stroke({
        color: 0x3a3220,
        width: 1,
        alpha: 0.7,
      });

      reel.addChild(reelBackground);

      // Reflexo sutil no topo do vidro
      const glassShine = new Graphics();

      glassShine.roundRect(3, 3, reelWidth - 6, 20, 8);
      glassShine.fill({ color: 0xffffff, alpha: 0.05 });

      reel.addChild(glassShine);

      // SÍMBOLOS
      const symbols: Sprite[] = [];

      for (let row = 0; row < 3; row++) {
        const symbolY = 42.5 + row * this.symbolHeight;

        // Sombra de apoio do símbolo
        const shadow = new Graphics();

        shadow.ellipse(reelWidth / 2, symbolY + 32, 32, 9);
        shadow.fill({ color: 0x000000, alpha: 0.32 });

        reel.addChild(shadow);

        const symbol = this.createSymbol(
          this.symbols[(row + i) % this.symbols.length]
        );

        // Centros: 42.5, 127.5 e 212.5.
        // O símbolo central fica em 127.5 + reel.y(100) = 227.5,
        // praticamente no centro da linha de pagamento.
        symbol.x = reelWidth / 2;
        symbol.y = symbolY;

        reel.addChild(symbol);
        symbols.push(symbol);
      }

      this.reels.push(reel);
      this.reelSymbols.push(symbols);
      this.reelPositions.push(startY);

      this.root.addChild(reel);
    }

    // INDICADORES
    this.createIndicator(29, 223, true, goldRing);
    this.createIndicator(661, 223, false, goldRing);
  }

  private createSymbol(value: SymbolType) {
    const texture = this.symbolTextures?.[value] ?? Texture.WHITE;
    const sprite = new Sprite(texture);

    sprite.anchor.set(0.5);
    sprite.width = this.symbolSize;
    sprite.height = this.symbolSize;

    return sprite;
  }

  private getTexture(value: SymbolType): Texture {
    return this.symbolTextures?.[value] ?? Texture.WHITE;
  }

  private createIndicator(
    x: number,
    y: number,
    left: boolean,
    fill: FillGradient
  ) {
    if (!this.root) return;

    const indicator = new Graphics();

    indicator.moveTo(left ? 0 : 14, 0);
    indicator.lineTo(left ? 14 : 0, 7);
    indicator.lineTo(left ? 0 : 14, 14);
    indicator.fill(fill);

    indicator.x = x;
    indicator.y = y;
    indicator.alpha = 0.85;

    this.root.addChild(indicator);
  }

  async spin(result: SpinResult) {
    if (this.spinning || !this.initialized) return;

    this.spinning = true;

    try {
      const animations = this.reels.map((reel, index) =>
        this.animateReel(reel, index, result[index])
      );

      await Promise.all(animations);
      this.setFinalResult(result);
    } finally {
      this.spinning = false;
    }
  }

  private animateReel(
    reel: Container,
    index: number,
    finalSymbol: SymbolType
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const duration = 900 + index * 220;
      const startY = this.reelPositions[index];
      const endY = startY + 18;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const eased = 1 - Math.pow(1 - progress, 3);

        reel.y = startY + (endY - startY) * eased;

        if (progress < 0.82) {
          const symbols = this.reelSymbols[index];

          symbols.forEach((symbol) => {
            symbol.texture = this.getTexture(
              this.symbols[
                Math.floor(Math.random() * this.symbols.length)
              ]
            );
          });
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          reel.y = startY;
          this.setReelResult(index, finalSymbol);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private setReelResult(index: number, symbol: SymbolType) {
    const symbols = this.reelSymbols[index];

    if (!symbols) return;

    // O resultado fica sempre no símbolo central.
    symbols[0].texture = this.getTexture(this.getRandomSymbol());
    symbols[1].texture = this.getTexture(symbol);
    symbols[2].texture = this.getTexture(this.getRandomSymbol());
  }

  private setFinalResult(result: SpinResult) {
    result.forEach((symbol, index) => {
      const symbols = this.reelSymbols[index];

      if (!symbols) return;

      symbols[0].texture = this.getTexture(this.getRandomSymbol());
      symbols[1].texture = this.getTexture(symbol);
      symbols[2].texture = this.getTexture(this.getRandomSymbol());
    });
  }

  private getRandomSymbol(): SymbolType {
    return this.symbols[
      Math.floor(Math.random() * this.symbols.length)
    ];
  }

  /**
   * Pulsa a payline e dá um "bounce" nos símbolos centrais.
   * Chamado pela UI quando o giro resulta em vitória.
   */
  celebrateWin(): Promise<void> {
    if (!this.root) return Promise.resolve();

    const centerSymbols = this.reelSymbols.map(
      (symbols) => symbols[1]
    );

    return new Promise((resolve) => {
      const startTime = performance.now();
      const duration = 1000;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const wave = Math.sin(progress * Math.PI * 3) * (1 - progress);
        const scale = 1 + wave * 0.2;

        centerSymbols.forEach((symbol) => {
          symbol?.scale.set(scale);
        });

        if (this.paylineGlow) {
          this.paylineGlow.alpha = 0.35 + Math.abs(wave) * 0.65;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          centerSymbols.forEach((symbol) => symbol?.scale.set(1));

          if (this.paylineGlow) {
            this.paylineGlow.alpha = 0.35;
          }

          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  private layout() {
    if (!this.app || !this.root) return;

    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    const scaleX = screenWidth / 700;
    const scaleY = screenHeight / 410;

    const scale = Math.min(scaleX, scaleY);

    this.root.scale.set(scale);

    this.root.x = (screenWidth - 700 * scale) / 2;
    this.root.y = (screenHeight - 410 * scale) / 2;
  }

  destroy() {
    this.destroyRequested = true;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Nunca destrua uma Application antes de app.init() terminar.
    if (!this.app || !this.initialized) {
      return;
    }

    try {
      this.app.destroy({ removeView: true });
    } catch (error) {
      console.warn("PixiJS destroy falhou:", error);
    }

    this.app = null;
    this.root = null;
    this.reels = [];
    this.reelSymbols = [];
    this.reelPositions = [];
    this.paylineGlow = null;
    this.spinning = false;
    this.initialized = false;
    this.destroyRequested = false;
  }
}
