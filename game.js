(() => {
  const GRID_COLS = 9;
  const GRID_ROWS = 22;
  const START_ROWS = 7;
  const COLORS = [
    { name: 'aqua', tint: 0x5ef5ff, rim: 0xd7fdff },
    { name: 'pink', tint: 0xff67dc, rim: 0xffd2f6 },
    { name: 'lime', tint: 0x94ff73, rim: 0xe0ffcc },
    { name: 'amber', tint: 0xffd56d, rim: 0xfff0c0 },
    { name: 'violet', tint: 0xab95ff, rim: 0xe1d7ff },
    { name: 'coral', tint: 0xff7d96, rim: 0xffccd8 },
  ];

  class FantasyBubbleShooter extends Phaser.Scene {
    constructor() {
      super('FantasyBubbleShooter');
      this.state = 'menu';
      this.grid = [];
      this.bubbles = [];
      this.score = 0;
      this.level = 1;
      this.combo = 0;
      this.shots = 0;
      this.sfx = {};
    }

    create() {
      this.createTextures();
      this.computeMetrics();
      this.createWorld();
      this.createHUD();
      this.createMenu();
      this.createPauseOverlay();
      this.startRound();
      this.scale.on('resize', this.onResize, this);
    }

    createTextures() {
      this.createOrbSpriteSheet();
      this.makeCrystal();
      this.makeSpark();
      this.makeRing();
      this.makeAimDot();
      this.makePanelTexture();
    }

    createOrbSpriteSheet() {
      const size = 160;
      COLORS.forEach((c) => {
        const key = `orb-${c.name}`;
        if (this.textures.exists(key)) return;
        const tex = this.textures.createCanvas(key, size, size);
        const ctx = tex.context;

        const rg = ctx.createRadialGradient(size * 0.38, size * 0.34, size * 8 / 160, size * 0.5, size * 0.5, size * 0.5);
        rg.addColorStop(0, '#ffffff');
        rg.addColorStop(0.2, Phaser.Display.Color.IntegerToRGB(c.rim).rgba);
        rg.addColorStop(0.55, Phaser.Display.Color.IntegerToRGB(c.tint).rgba);
        rg.addColorStop(0.85, 'rgba(20,15,45,0.95)');
        rg.addColorStop(1, 'rgba(6,4,12,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(size * 0.36, size * 0.3, size * 0.12, size * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.ellipse(size * 0.58, size * 0.66, size * 0.18, size * 0.12, 0.2, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.025;
        ctx.beginPath(); ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2); ctx.stroke();

        ctx.globalAlpha = 1;
        tex.refresh();
      });
    }

    makeCrystal() {
      if (this.textures.exists('crystal')) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x82f5ff, 1);
      g.beginPath(); g.moveTo(74, 0); g.lineTo(136, 48); g.lineTo(90, 164); g.lineTo(54, 164); g.lineTo(10, 48); g.closePath(); g.fillPath();
      g.fillStyle(0xffffff, 0.25); g.beginPath(); g.moveTo(76, 8); g.lineTo(95, 50); g.lineTo(74, 150); g.lineTo(59, 50); g.closePath(); g.fillPath();
      g.generateTexture('crystal', 148, 168);
      g.destroy();
    }

    makeSpark() {
      if (this.textures.exists('spark')) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1); g.fillCircle(10, 10, 10); g.generateTexture('spark', 20, 20); g.destroy();
    }

    makeRing() {
      if (this.textures.exists('ring')) return;
      const g = this.make.graphics({ add: false });
      g.lineStyle(10, 0xffffff, 1); g.strokeCircle(40, 40, 30); g.generateTexture('ring', 80, 80); g.destroy();
    }

    makeAimDot() {
      if (this.textures.exists('aimdot')) return;
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x9df8ff, 1); g.fillCircle(8, 8, 8); g.generateTexture('aimdot', 16, 16); g.destroy();
    }

    makePanelTexture() {
      if (this.textures.exists('hud-panel')) return;
      const g = this.make.graphics({ add: false });
      g.fillGradientStyle(0x1f113a, 0x2b1651, 0x120a26, 0x120a26, 0.95);
      g.fillRoundedRect(0, 0, 1024, 120, 26);
      g.lineStyle(4, 0x86f8ff, 0.45); g.strokeRoundedRect(2, 2, 1020, 116, 24);
      g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(20, 12, 984, 34, 14);
      g.generateTexture('hud-panel', 1024, 120);
      g.destroy();
    }

    computeMetrics() {
      this.w = this.scale.width; this.h = this.scale.height;
      this.top = this.h * 0.15; this.bottom = this.h * 0.17;
      this.radius = Math.max(18, Math.floor(this.w / 21));
      this.rowH = Math.floor(this.radius * 1.76);
      this.gridLeft = (this.w - GRID_COLS * this.radius * 2) * 0.5;
      this.cannonX = this.w * 0.5; this.cannonY = this.h - this.bottom * 0.54;
    }

    createWorld() {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x130927, 0x2d1456, 0x090b1d, 0x05040d, 1); bg.fillRect(0, 0, this.w, this.h);

      this.farLayer = this.add.container(0, 0);
      this.midLayer = this.add.container(0, 0);
      this.nearLayer = this.add.container(0, 0);

      for (let i = 0; i < 14; i++) {
        const y = this.h * 0.72 + Phaser.Math.Between(-34, 40);
        const crystal = this.add.image((i + 0.5) * this.w / 14, y, 'crystal').setScale(Phaser.Math.FloatBetween(0.28, 0.72)).setAlpha(0.58).setBlendMode(Phaser.BlendModes.SCREEN);
        crystal.setTint(Phaser.Utils.Array.GetRandom([0x71f8ff, 0xb69cff, 0xff90ea]));
        this.farLayer.add(crystal);
        this.tweens.add({ targets: crystal, y: y - Phaser.Math.Between(8, 22), alpha: { from: 0.3, to: 0.84 }, duration: Phaser.Math.Between(1600, 3400), yoyo: true, repeat: -1 });
      }

      const fogA = this.add.rectangle(this.w * 0.2, this.h * 0.36, this.w * 0.65, this.h * 0.34, 0x70f8ff, 0.08).setBlendMode(Phaser.BlendModes.ADD);
      const fogB = this.add.rectangle(this.w * 0.82, this.h * 0.27, this.w * 0.6, this.h * 0.3, 0xff78e9, 0.08).setBlendMode(Phaser.BlendModes.ADD);
      const fogC = this.add.rectangle(this.w * 0.5, this.h * 0.11, this.w * 0.8, this.h * 0.22, 0xb18eff, 0.06).setBlendMode(Phaser.BlendModes.SCREEN);
      [fogA, fogB, fogC].forEach((f, i) => this.tweens.add({ targets: f, alpha: { from: f.alpha * 0.55, to: f.alpha * 1.6 }, duration: 1700 + i * 520, yoyo: true, repeat: -1 }));

      for (let i = 0; i < 90; i++) {
        const p = this.add.image(Phaser.Math.Between(0, this.w), Phaser.Math.Between(0, this.h), 'spark').setScale(Phaser.Math.FloatBetween(0.05, 0.2)).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD);
        this.midLayer.add(p);
        this.tweens.add({ targets: p, alpha: { from: 0.05, to: 0.34 }, duration: Phaser.Math.Between(1100, 2600), yoyo: true, repeat: -1 });
      }

      this.ambientParticles = this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: this.w }, y: this.h,
        speedY: { min: -25, max: -95 }, speedX: { min: -22, max: 22 },
        scale: { start: 0.26, end: 0 }, alpha: { start: 0.26, end: 0 },
        lifespan: 2900, frequency: 110, blendMode: 'ADD',
        tint: [0x74f8ff, 0xff86ea, 0xcfa7ff],
      });

      this.popParticles = this.add.particles(0, 0, 'spark', {
        speed: { min: 80, max: 330 }, quantity: 0,
        scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 },
        lifespan: 660, emitting: false, blendMode: 'ADD',
      });

      this.aimDots = this.add.group();
    }

    createHUD() {
      this.hud = this.add.container(0, 0).setDepth(20);
      const panel = this.add.image(this.w * 0.5, 52, 'hud-panel').setDisplaySize(this.w - 24, 84);
      const scoreLabel = this.add.text(30, 28, 'SCORE', { fontFamily: 'Trebuchet MS', fontSize: '14px', color: '#d6f9ff', letterSpacing: 2 });
      this.scoreText = this.add.text(30, 44, '000000', { fontFamily: 'Trebuchet MS', fontSize: '30px', color: '#9ef8ff', stroke: '#100621', strokeThickness: 6 });
      this.levelBadge = this.add.image(this.w - 70, 52, 'hud-panel').setDisplaySize(116, 64).setAlpha(0.9);
      this.levelText = this.add.text(this.w - 70, 52, 'LV 1', { fontFamily: 'Trebuchet MS', fontSize: '24px', color: '#ffd7f9', stroke: '#110722', strokeThickness: 5 }).setOrigin(0.5);
      this.pauseBtn = this.add.text(this.w - 18, this.h - 56, 'II', { fontFamily: 'Trebuchet MS', fontSize: '30px', color: '#caf9ff', backgroundColor: '#261346' }).setPadding(10, 4, 10, 4).setOrigin(1).setInteractive({ useHandCursor: true });
      this.pauseBtn.on('pointerdown', () => this.togglePause());
      this.comboText = this.add.text(this.w / 2, this.h * 0.25, '', { fontFamily: 'Trebuchet MS', fontSize: '46px', fontStyle: 'bold', color: '#fff4a3', stroke: '#3b1251', strokeThickness: 11 }).setOrigin(0.5).setAlpha(0);
      this.hud.add([panel, scoreLabel, this.scoreText, this.levelBadge, this.levelText, this.pauseBtn, this.comboText]);
    }

    createMenu() {
      this.menu = this.add.container(0, 0).setDepth(50);
      const shade = this.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x03020a, 0.62);
      const title = this.add.text(this.w / 2, this.h * 0.24, 'NEON ARCANA', { fontFamily: 'Trebuchet MS', fontSize: '54px', fontStyle: 'bold', color: '#dffbff', stroke: '#1c0c35', strokeThickness: 10 }).setOrigin(0.5);
      const subtitle = this.add.text(this.w / 2, this.h * 0.31, 'CRYSTAL BUBBLE SAGA', { fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#f2cfff', letterSpacing: 3 }).setOrigin(0.5);
      const play = this.add.text(this.w / 2, this.h * 0.54, 'PLAY', { fontFamily: 'Trebuchet MS', fontSize: '40px', color: '#ffffff', backgroundColor: '#3b1f6f', padding: { x: 36, y: 14 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const tip = this.add.text(this.w / 2, this.h * 0.67, 'Aim carefully. Chain combos. Rule the cave.', { fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#bdeeff' }).setOrigin(0.5);
      play.on('pointerdown', () => this.beginGame());
      this.tweens.add({ targets: title, scale: { from: 0.97, to: 1.03 }, duration: 1500, yoyo: true, repeat: -1 });
      this.menu.add([shade, title, subtitle, play, tip]);
    }

    createPauseOverlay() {
      this.pauseOverlay = this.add.container(0, 0).setDepth(60).setVisible(false);
      const shade = this.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x05030d, 0.74);
      const t = this.add.text(this.w / 2, this.h / 2 - 50, 'PAUSED', { fontFamily: 'Trebuchet MS', fontSize: '52px', color: '#ccf9ff', stroke: '#170a2a', strokeThickness: 8 }).setOrigin(0.5);
      const restart = this.add.text(this.w / 2, this.h / 2 + 34, 'RESTART', { fontFamily: 'Trebuchet MS', fontSize: '30px', color: '#ffe0fb', backgroundColor: '#2b1550', padding: { x: 18, y: 8 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      restart.on('pointerdown', () => this.restartGame());
      this.pauseOverlay.add([shade, t, restart]);
    }

    startRound() {
      this.createGrid();
      this.createCannon();
      this.prepareShot();
      this.bindInput();
    }

    beginGame() {
      this.state = 'playing';
      this.tweens.add({ targets: this.menu, alpha: 0, duration: 280, onComplete: () => this.menu.setVisible(false) });
      this.cameras.main.fadeIn(260, 8, 8, 20);
    }

    createGrid() {
      this.grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
      for (let r = 0; r < START_ROWS; r++) for (let c = 0; c < GRID_COLS; c++) this.spawnBubble(r, c, Phaser.Math.Between(0, COLORS.length - 1));
    }

    makeOrb(x, y, colorIdx) {
      const color = COLORS[colorIdx];
      const orb = this.add.container(x, y);
      const shadow = this.add.image(4, 10, `orb-${color.name}`).setScale(this.radius / 58).setTint(0x000000).setAlpha(0.35);
      const glow = this.add.image(0, 0, `orb-${color.name}`).setScale(this.radius / 49).setAlpha(0.54).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.image(0, 0, `orb-${color.name}`).setScale(this.radius / 53);
      const reflection = this.add.image(-this.radius * 0.2, -this.radius * 0.24, 'spark').setScale(0.28).setAlpha(0.66).setBlendMode(Phaser.BlendModes.SCREEN);
      orb.add([shadow, glow, core, reflection]);
      orb.live = true;
      this.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.85 }, scale: { from: glow.scale * 0.94, to: glow.scale * 1.08 }, duration: 920, yoyo: true, repeat: -1 });
      return orb;
    }

    spawnBubble(r, c, colorIdx) {
      const p = this.cellToWorld(r, c);
      const b = this.makeOrb(p.x, p.y, colorIdx);
      b.row = r; b.col = c; b.colorIdx = colorIdx;
      this.grid[r][c] = b; this.bubbles.push(b);
      return b;
    }

    createCannon() {
      this.cannon = this.add.container(this.cannonX, this.cannonY).setDepth(10);
      const baseShadow = this.add.image(0, 16, 'hud-panel').setDisplaySize(this.radius * 4, this.radius * 2).setTint(0x000000).setAlpha(0.35);
      const base = this.add.image(0, 8, 'hud-panel').setDisplaySize(this.radius * 3.2, this.radius * 2.1);
      this.barrel = this.add.container(0, -8);
      const barrelGlow = this.add.image(0, -this.radius * 0.8, 'hud-panel').setDisplaySize(this.radius * 1.7, this.radius * 2.9).setTint(0x8f66ff).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
      const barrelCore = this.add.image(0, -this.radius * 0.74, 'hud-panel').setDisplaySize(this.radius * 1.22, this.radius * 2.45).setTint(0x3a2869);
      this.barrel.add([barrelGlow, barrelCore]);
      this.cannonCore = this.add.image(0, -2, 'spark').setScale(1.25).setTint(0x89f8ff).setBlendMode(Phaser.BlendModes.ADD);
      this.cannon.add([baseShadow, base, this.barrel, this.cannonCore]);
      this.tweens.add({ targets: this.cannonCore, alpha: { from: 0.36, to: 0.95 }, duration: 650, yoyo: true, repeat: -1 });
    }

    bindInput() {
      this.input.on('pointermove', (p) => this.state === 'playing' && !this.shooting && this.updateAim(p.x, p.y));
      this.input.on('pointerdown', (p) => this.state === 'playing' && !this.shooting && this.fire(p.x, p.y));
      this.input.keyboard?.on('keydown-P', () => this.togglePause());
      this.input.keyboard?.on('keydown-R', () => this.restartGame());
    }

    prepareShot() {
      if (this.currentShot) this.currentShot.destroy();
      const idx = Phaser.Math.Between(0, COLORS.length - 1);
      this.currentShot = this.makeOrb(this.cannonX, this.cannonY - this.radius * 1.5, idx);
      this.currentShot.colorIdx = idx;
      this.shooting = false;
    }

    updateAim(x, y) {
      this.aimDots.clear(true, true);
      const o = new Phaser.Math.Vector2(this.cannonX, this.cannonY - this.radius);
      const d = new Phaser.Math.Vector2(x - o.x, y - o.y);
      if (d.y > -8) return;
      const a = Phaser.Math.Clamp(d.angle(), -Math.PI + 0.22, -0.22);
      this.barrel.rotation = a + Math.PI / 2;
      let p = o.clone(); let v = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a)).scale(26);
      for (let i = 0; i < 30; i++) {
        const dot = this.add.image(p.x, p.y, 'aimdot').setScale(Phaser.Math.Linear(0.45, 0.14, i / 30)).setTint(i % 2 ? 0x7ff9ff : 0xe8d9ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
        this.aimDots.add(dot);
        const n = p.clone().add(v);
        if (n.x < this.gridLeft + this.radius || n.x > this.gridLeft + GRID_COLS * this.radius * 2 - this.radius) v.x *= -1;
        p = p.add(v); if (p.y < this.top) break;
      }
    }

    fire(x, y) {
      const o = new Phaser.Math.Vector2(this.cannonX, this.cannonY - this.radius);
      const d = new Phaser.Math.Vector2(x - o.x, y - o.y);
      if (d.y > -4) return;
      d.normalize(); this.vel = d.scale(710); this.shooting = true;
      this.aimDots.clear(true, true);
      this.tweens.add({ targets: this.cannon, y: this.cannonY + 8, yoyo: true, duration: 85 });
      this.tweens.add({ targets: this.barrel, scaleY: 0.8, yoyo: true, duration: 82 });
    }

    update(_, dt) {
      if (this.state !== 'playing' || !this.shooting || !this.currentShot) return;
      const t = dt / 1000;
      this.currentShot.x += this.vel.x * t; this.currentShot.y += this.vel.y * t;
      const minX = this.gridLeft + this.radius, maxX = this.gridLeft + GRID_COLS * this.radius * 2 - this.radius;
      if (this.currentShot.x <= minX || this.currentShot.x >= maxX) { this.vel.x *= -1; this.currentShot.x = Phaser.Math.Clamp(this.currentShot.x, minX, maxX); }
      if (this.currentShot.y <= this.top + this.radius || this.collides()) this.attachShot();
      this.farLayer.x = Math.sin(this.time.now * 0.00018) * 7;
      this.midLayer.x = Math.sin(this.time.now * 0.0003) * 11;
    }

    collides() { for (const b of this.bubbles) { if (!b.live) continue; if (Phaser.Math.Distance.Between(this.currentShot.x, this.currentShot.y, b.x, b.y) <= this.radius * 1.8) return true; } return false; }

    attachShot() {
      const r = Phaser.Math.Clamp(Math.round((this.currentShot.y - this.top) / this.rowH), 0, GRID_ROWS - 1);
      const c = Phaser.Math.Clamp(Math.round((this.currentShot.x - this.gridLeft) / (this.radius * 2)), 0, GRID_COLS - 1);
      const placed = this.spawnBubble(r, c, this.currentShot.colorIdx);
      this.currentShot.destroy(); this.currentShot = null; this.shooting = false; this.shots++;
      const popped = this.resolve(placed);
      if (popped > 0) {
        this.combo++; const gain = popped * 20 * this.combo; this.score += gain;
        this.showCombo(`COMBO x${this.combo}\n+${gain}`);
        this.cameras.main.shake(130, 0.004 + Math.min(0.004, this.combo * 0.00045));
      } else { this.combo = 0; this.score += 10; }
      if (this.shots % 8 === 0) this.levelUp();
      this.updateHUD(); this.prepareShot();
    }

    resolve(seed) { const g = this.flood(seed.row, seed.col, seed.colorIdx); if (g.length < 3) return 0; g.forEach((b, i) => this.popBubble(b, i)); return g.length; }
    flood(r, c, color) { const s = [[r, c]], v = new Set(), f = []; while (s.length) { const [rr, cc] = s.pop(); const k = `${rr},${cc}`; if (v.has(k)) continue; v.add(k); const b = this.grid[rr]?.[cc]; if (!b || !b.live || b.colorIdx !== color) continue; f.push(b); [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => { const nr = rr + dr, nc = cc + dc; if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) s.push([nr, nc]); }); } return f; }

    popBubble(b, i) {
      this.grid[b.row][b.col] = null; b.live = false;
      this.popParticles.explode(22, b.x, b.y);
      const ring = this.add.image(b.x, b.y, 'ring').setTint(COLORS[b.colorIdx].tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
      this.tweens.add({ targets: b, scaleX: 0, scaleY: 0, alpha: 0, duration: 230, delay: i * 25, onComplete: () => b.destroy() });
      this.tweens.add({ targets: ring, scale: 2.05, alpha: 0, duration: 290, onComplete: () => ring.destroy() });
    }

    showCombo(t) {
      this.comboText.setText(t).setScale(0.56).setAlpha(0);
      this.tweens.add({ targets: this.comboText, alpha: 1, scale: 1.04, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: this.comboText, alpha: 0, y: this.comboText.y - 42, duration: 860, delay: 200, ease: 'Cubic.easeIn', onComplete: () => { this.comboText.y = this.h * 0.25; } });
    }

    levelUp() {
      this.level++;
      for (let r = GRID_ROWS - 2; r >= 0; r--) for (let c = 0; c < GRID_COLS; c++) {
        const b = this.grid[r][c]; if (!b || !b.live) continue;
        this.grid[r + 1][c] = b; this.grid[r][c] = null; b.row = r + 1;
        const p = this.cellToWorld(b.row, c); this.tweens.add({ targets: b, x: p.x, y: p.y, duration: 230 });
      }
      for (let c = 0; c < GRID_COLS; c++) this.spawnBubble(0, c, Phaser.Math.Between(0, COLORS.length - 1));
      this.cameras.main.flash(150, 120, 60, 255, false);
    }

    updateHUD() { this.scoreText.setText(String(this.score).padStart(6, '0')); this.levelText.setText(`LV ${this.level}`); }

    togglePause() {
      if (this.state === 'playing') { this.state = 'paused'; this.pauseOverlay.setVisible(true); this.tweens.pauseAll(); }
      else if (this.state === 'paused') { this.state = 'playing'; this.pauseOverlay.setVisible(false); this.tweens.resumeAll(); }
    }

    restartGame() { this.cameras.main.fadeOut(180, 10, 8, 20); this.time.delayedCall(190, () => this.scene.restart()); }

    cellToWorld(r, c) { return { x: this.gridLeft + c * this.radius * 2 + this.radius, y: this.top + r * this.rowH + this.radius }; }
    onResize(size) { this.cameras.main.setViewport(0, 0, size.width, size.height); this.scene.restart(); }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#090713',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth, height: window.innerHeight },
    scene: FantasyBubbleShooter,
    fps: { target: 60, forceSetTimeOut: true },
  });
})();
