(() => {
  const BUBBLE_COLORS = [0x66f6ff, 0xff66de, 0x8dff66, 0xffdf66, 0xa182ff, 0xff7f90];
  const GRID_COLS = 9;
  const START_ROWS = 6;

  class BubbleShooterScene extends Phaser.Scene {
    constructor() {
      super('BubbleShooterScene');
      this.score = 0;
      this.level = 1;
      this.combo = 0;
      this.shotsFired = 0;
      this.grid = [];
      this.bubblePool = [];
      this.gameW = 0;
      this.gameH = 0;
    }

    preload() {}

    create() {
      this.createResponsiveMetrics();
      this.createBackground();
      this.createEffects();
      this.createUI();
      this.createGrid();
      this.createCannon();
      this.prepareShot();
      this.registerInput();
      this.scale.on('resize', this.onResize, this);
    }

    createResponsiveMetrics() {
      this.gameW = this.scale.width;
      this.gameH = this.scale.height;
      this.topMargin = this.gameH * 0.12;
      this.bottomMargin = this.gameH * 0.16;
      this.bubbleRadius = Math.max(16, Math.floor(this.gameW / 22));
      this.rowHeight = Math.floor(this.bubbleRadius * 1.75);
      this.gridLeft = (this.gameW - GRID_COLS * this.bubbleRadius * 2) / 2;
      this.cannonY = this.gameH - this.bottomMargin * 0.58;
      this.playHeight = this.cannonY - this.topMargin - this.bubbleRadius;
    }

    createBackground() {
      const g = this.add.graphics();
      g.fillGradientStyle(0x130922, 0x2f1254, 0x061029, 0x100718, 1);
      g.fillRect(0, 0, this.gameW, this.gameH);

      for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(0, this.gameW);
        const y = Phaser.Math.Between(0, this.gameH);
        const r = Phaser.Math.Between(2, 7);
        const c = Phaser.Utils.Array.GetRandom([0x66f6ff, 0xa582ff, 0xff66de]);
        const star = this.add.circle(x, y, r, c, 0.1);
        this.tweens.add({ targets: star, alpha: { from: 0.08, to: 0.28 }, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1200, 3000) });
      }

      for (let i = 0; i < 9; i++) {
        const cx = (i + 0.5) * (this.gameW / 9);
        const crystal = this.add.triangle(cx, this.gameH * 0.78 + Phaser.Math.Between(-15, 15), 0, 70, 22, 0, 44, 70, 0x4fe4ff, 0.18).setBlendMode(Phaser.BlendModes.SCREEN);
        this.tweens.add({ targets: crystal, y: crystal.y - Phaser.Math.Between(8, 18), yoyo: true, duration: Phaser.Math.Between(1800, 3200), repeat: -1 });
      }
    }

    createEffects() {
      this.aimLine = this.add.graphics();
      const particleTexture = this.makeParticleTexture();
      this.explodeParticles = this.add.particles(0, 0, particleTexture, {
        speed: { min: 60, max: 220 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 500,
        blendMode: 'ADD',
        quantity: 0,
        emitting: false,
      });
    }

    makeParticleTexture() {
      const key = 'spark';
      if (!this.textures.exists(key)) {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture(key, 8, 8);
        gfx.destroy();
      }
      return key;
    }

    createUI() {
      this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '24px', color: '#9ef9ff', stroke: '#100722', strokeThickness: 4 });
      this.levelText = this.add.text(this.gameW - 20, 20, 'Level 1', { fontSize: '22px', color: '#ffd2f7', stroke: '#100722', strokeThickness: 4 }).setOrigin(1, 0);
      this.comboText = this.add.text(this.gameW / 2, 24, '', { fontSize: '28px', color: '#fffa9a', stroke: '#421039', strokeThickness: 6 }).setOrigin(0.5, 0).setAlpha(0);
    }

    createGrid() {
      this.grid = Array.from({ length: 20 }, () => Array(GRID_COLS).fill(null));
      for (let row = 0; row < START_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          this.spawnBubbleAt(row, col, Phaser.Math.Between(0, BUBBLE_COLORS.length - 1));
        }
      }
    }

    spawnBubbleAt(row, col, colorIdx) {
      const { x, y } = this.cellToWorld(row, col);
      const bubble = this.add.circle(x, y, this.bubbleRadius - 1, BUBBLE_COLORS[colorIdx], 1).setStrokeStyle(2, 0xffffff, 0.5);
      bubble.row = row;
      bubble.col = col;
      bubble.colorIdx = colorIdx;
      bubble.activeBubble = true;
      const glow = this.add.circle(x, y, this.bubbleRadius + 5, BUBBLE_COLORS[colorIdx], 0.13).setBlendMode(Phaser.BlendModes.ADD);
      bubble.glow = glow;
      this.grid[row][col] = bubble;
      this.bubblePool.push(bubble);
      this.tweens.add({ targets: glow, alpha: { from: 0.09, to: 0.24 }, duration: 900, yoyo: true, repeat: -1 });
      return bubble;
    }

    createCannon() {
      this.cannonBase = this.add.circle(this.gameW / 2, this.cannonY + 10, this.bubbleRadius * 1.2, 0x2a1744, 0.9).setStrokeStyle(3, 0x7af0ff, 0.5);
      this.cannonBarrel = this.add.rectangle(this.gameW / 2, this.cannonY - 12, this.bubbleRadius * 1.1, this.bubbleRadius * 2.3, 0x532f9d, 0.9).setOrigin(0.5, 1).setStrokeStyle(2, 0xe9c3ff, 0.5);
      this.cannonCore = this.add.circle(this.gameW / 2, this.cannonY, this.bubbleRadius * 0.55, 0x6ff6ff, 0.55).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: this.cannonCore, alpha: { from: 0.35, to: 0.8 }, duration: 620, yoyo: true, repeat: -1 });
    }

    prepareShot() {
      if (this.currentShot) this.currentShot.destroy();
      const colorIdx = Phaser.Math.Between(0, BUBBLE_COLORS.length - 1);
      this.currentShot = this.add.circle(this.gameW / 2, this.cannonY - this.bubbleRadius * 1.2, this.bubbleRadius - 1, BUBBLE_COLORS[colorIdx], 1).setStrokeStyle(2, 0xffffff, 0.7);
      this.currentShot.colorIdx = colorIdx;
      this.currentVelocity = null;
      this.shooting = false;
    }

    registerInput() {
      this.input.on('pointermove', (pointer) => {
        if (this.shooting) return;
        this.updateAim(pointer.x, pointer.y);
      });
      this.input.on('pointerdown', (pointer) => {
        if (this.shooting) return;
        this.fire(pointer.x, pointer.y);
      });
    }

    updateAim(x, y) {
      const origin = new Phaser.Math.Vector2(this.gameW / 2, this.cannonY);
      const target = new Phaser.Math.Vector2(x, y);
      const dir = target.subtract(origin);
      if (dir.y > -8) return;
      const angle = Phaser.Math.Clamp(dir.angle(), -Math.PI + 0.22, -0.22);
      this.cannonBarrel.setRotation(angle + Math.PI / 2);
      this.aimLine.clear();
      this.aimLine.lineStyle(3, 0x8cf6ff, 0.6);

      let p = origin.clone();
      let v = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(22);
      for (let i = 0; i < 26; i++) {
        const next = p.clone().add(v);
        if (next.x < this.gridLeft + this.bubbleRadius || next.x > this.gridLeft + GRID_COLS * this.bubbleRadius * 2 - this.bubbleRadius) v.x *= -1;
        this.aimLine.strokeCircle(p.x, p.y, 1.7);
        p = p.add(v);
        if (p.y < this.topMargin) break;
      }
    }

    fire(x, y) {
      const origin = new Phaser.Math.Vector2(this.gameW / 2, this.cannonY - this.bubbleRadius);
      const dir = new Phaser.Math.Vector2(x - origin.x, y - origin.y);
      if (dir.y > -5) return;
      dir.normalize();
      this.currentVelocity = dir.scale(640);
      this.shooting = true;
      this.aimLine.clear();
      this.tweens.add({ targets: this.cannonBarrel, scaleY: 0.84, yoyo: true, duration: 90 });
    }

    update(_, delta) {
      if (!this.shooting || !this.currentShot) return;
      const t = delta / 1000;
      this.currentShot.x += this.currentVelocity.x * t;
      this.currentShot.y += this.currentVelocity.y * t;

      const minX = this.gridLeft + this.bubbleRadius;
      const maxX = this.gridLeft + GRID_COLS * this.bubbleRadius * 2 - this.bubbleRadius;
      if (this.currentShot.x < minX || this.currentShot.x > maxX) {
        this.currentVelocity.x *= -1;
        this.currentShot.x = Phaser.Math.Clamp(this.currentShot.x, minX, maxX);
      }

      if (this.currentShot.y <= this.topMargin + this.bubbleRadius || this.isColliding()) {
        this.attachShot();
      }
    }

    isColliding() {
      for (const bubble of this.bubblePool) {
        if (!bubble.activeBubble) continue;
        if (Phaser.Math.Distance.Between(this.currentShot.x, this.currentShot.y, bubble.x, bubble.y) <= this.bubbleRadius * 1.9) return true;
      }
      return false;
    }

    attachShot() {
      const row = Phaser.Math.Clamp(Math.round((this.currentShot.y - this.topMargin) / this.rowHeight), 0, this.grid.length - 1);
      const col = Phaser.Math.Clamp(Math.round((this.currentShot.x - this.gridLeft) / (this.bubbleRadius * 2)), 0, GRID_COLS - 1);

      const placed = this.spawnBubbleAt(row, col, this.currentShot.colorIdx);
      this.currentShot.destroy();
      this.currentShot = null;
      this.shooting = false;
      this.shotsFired += 1;

      const removed = this.resolveMatches(placed);
      if (removed >= 3) {
        this.combo += 1;
        const gained = removed * 10 * this.combo;
        this.score += gained;
        this.flashCombo(`Combo x${this.combo}  +${gained}`);
      } else {
        this.combo = 0;
        this.score += 5;
      }

      if (this.shotsFired % 8 === 0) this.raiseLevel();
      this.refreshUI();
      this.prepareShot();
    }

    resolveMatches(seed) {
      const group = this.floodFill(seed.row, seed.col, seed.colorIdx);
      if (group.length < 3) return 0;
      group.forEach((bubble) => {
        this.grid[bubble.row][bubble.col] = null;
        bubble.activeBubble = false;
        bubble.destroy();
        bubble.glow.destroy();
        this.explodeParticles.explode(12, bubble.x, bubble.y);
      });
      return group.length;
    }

    floodFill(row, col, colorIdx) {
      const stack = [[row, col]];
      const visited = new Set();
      const found = [];
      while (stack.length) {
        const [r, c] = stack.pop();
        const key = `${r}-${c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const b = this.grid[r]?.[c];
        if (!b || b.colorIdx !== colorIdx) continue;
        found.push(b);
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nc >= 0 && nc < GRID_COLS && nr < this.grid.length) stack.push([nr, nc]);
        });
      }
      return found;
    }

    flashCombo(text) {
      this.comboText.setText(text).setAlpha(1).setScale(0.8);
      this.tweens.add({ targets: this.comboText, alpha: 0, scale: 1.15, duration: 700, ease: 'Cubic.easeOut' });
    }

    raiseLevel() {
      this.level += 1;
      for (let row = this.grid.length - 2; row >= 0; row--) {
        for (let col = 0; col < GRID_COLS; col++) {
          const b = this.grid[row][col];
          if (!b) continue;
          this.grid[row + 1][col] = b;
          b.row = row + 1;
          const { x, y } = this.cellToWorld(b.row, b.col);
          this.tweens.add({ targets: [b, b.glow], y, x, duration: 200 });
        }
      }
      for (let col = 0; col < GRID_COLS; col++) this.spawnBubbleAt(0, col, Phaser.Math.Between(0, BUBBLE_COLORS.length - 1));
    }

    refreshUI() {
      this.scoreText.setText(`Score: ${this.score}`);
      this.levelText.setText(`Level ${this.level}`);
    }

    cellToWorld(row, col) {
      return {
        x: this.gridLeft + col * this.bubbleRadius * 2 + this.bubbleRadius,
        y: this.topMargin + row * this.rowHeight + this.bubbleRadius,
      };
    }

    onResize(gameSize) {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this.scene.restart();
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#090712',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: BubbleShooterScene,
    fps: { target: 60, forceSetTimeOut: true },
  };

  new Phaser.Game(config);
})();
