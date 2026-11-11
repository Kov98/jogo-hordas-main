// Comandos da partida só são aplicados depois de autorizados pelo servidor.
const GameAdmin = window.GameAdmin = {
  game() {
    const scene = window.GAME?.scene.getScene('Game');
    if (!scene?.player || scene.ended || !window.GAME.scene.isActive('Game') && !window.GAME.scene.isPaused('Game')) throw new Error('Inicie uma partida para usar estes comandos.');
    return scene;
  },
  async execute(command, args = {}) {
    if (!GamePortal.isAdmin) throw new Error('Acesso exclusivo do administrador.');
    const origin = this.game(), initialization = origin.initialization, player = origin.player;
    const userId = GamePortal.user?.id, csrf = GamePortal.csrf;
    const result = await GamePortal.request('/api/admin/command', { method: 'POST', body: { command, args } });
    if (!GamePortal.isAdmin || GamePortal.user?.id !== userId || GamePortal.csrf !== csrf) throw new Error('Sua sessão de administrador terminou.');
    const g = this.game(), p = g.player, a = result.args || {};
    if (g !== origin || g.initialization !== initialization || p !== player) throw new Error('Esta partida foi substituída. Envie o comando novamente.');
    g.isPractice = true;
    switch (result.command) {
      case 'stats':
        if (a.maxHp !== undefined) p.maxHp = a.maxHp;
        if (a.hp !== undefined) p.hp = Math.min(a.hp, p.maxHp);
        else p.hp = Math.min(p.hp, p.maxHp);
        if (a.speed !== undefined) p.baseSpeed = a.speed / p.mods.speed;
        for (const key of ['damage', 'rate', 'area', 'range']) if (a[key] !== undefined) p.mods[key] = a[key];
        break;
      case 'spawn': {
        let count = 0;
        for (let i = 0; i < a.count; i++) {
          const angle = i / a.count * Math.PI * 2, radius = 200 + i % 3 * 48;
          const x = clamp(p.x + Math.cos(angle) * radius, CONFIG.world.border + 30, CONFIG.world.w - CONFIG.world.border - 30);
          const y = clamp(p.y + Math.sin(angle) * radius, CONFIG.world.border + 30, CONFIG.world.h - CONFIG.world.border - 30);
          const enemy = g.enemies.spawn(a.enemy, x, y, 1);
          if (enemy) { g.world.constrain(enemy); enemy.sprite.setPosition(enemy.x, enemy.y).setDepth(enemy.y + 20); count++; }
        }
        return `${count} inimigo(s) criado(s).`;
      }
      case 'power': {
        const power = p.addPower(a.id);
        power.level = Math.min(a.level, power.maxLevel); power.recompute();
        if (power.impl.onLevel) power.impl.onLevel(power);
        break;
      }
      case 'maxpowers':
        for (const power of p.powers) { while (!power.maxed) power.levelUp(); }
        break;
      case 'level': p.level = a.level; p.xp = 0; p.xpNext = CONFIG.xpNeeded(a.level); break;
      case 'xp': p.gainXp(a.amount); break;
      case 'heal': p.heal(p.maxHp); break;
      case 'god': g.godMode = a.enabled; break;
      case 'spawning': g.spawningEnabled = a.enabled; break;
      case 'clear': g.enemies.killAllSilently(); g.enemyShots.clear(); break;
      case 'boss': if (!g.bossStarted) g.startBossFight(); else throw new Error('O chefe já está nesta partida.'); break;
      case 'killboss':
        if (!g.boss?.alive) throw new Error('Não há chefe vivo nesta partida.');
        g.boss.invuln = false; g.damageEnemy(g.boss, g.boss.hp + 1, null); break;
      case 'teleport':
        p.x = a.x; p.y = a.y; g.world.constrain(p);
        p.sprite.setPosition(p.x, p.y); g.cameras.main.centerOn(p.x, p.y); break;
      default: throw new Error('Comando não reconhecido.');
    }
    return 'Comando aplicado. Partida de treino.';
  },
  open() {
    if (!GamePortal.isAdmin) return GamePortal.notice('Acesso exclusivo do administrador.');
    const dialog = GamePortal.openDialog('Administração');
    if (!dialog) return;
    const node = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
    const nav = node('div', '', 'admin-tabs'), content = node('div', '', 'admin-content');
    const status = node('p', '', 'admin-status'); status.setAttribute('role', 'status');
    dialog.body.append(nav, content);
    dialog.footer.append(status);
    const button = (label, fn, parent = content) => { const b = node('button', label); b.type = 'button'; b.addEventListener('click', fn); parent.append(b); return b; };
    const field = (parent, label, value, { min = 0, max = 1000000, step = 'any', type = 'number' } = {}) => {
      const wrap = node('label', label, 'admin-field'), input = document.createElement('input');
      input.type = type; input.value = String(value ?? '');
      if (type === 'number') { input.min = min; input.max = max; input.step = step; }
      wrap.append(input); parent.append(wrap); return input;
    };
    const select = (parent, label, values) => {
      const wrap = node('label', label, 'admin-field'), input = document.createElement('select');
      input.setAttribute('aria-label', label);
      for (const [value, text] of values) { const option = node('option', text); option.value = value; input.append(option); }
      wrap.append(input); parent.append(wrap); return input;
    };
    const perform = async (command, args = {}) => {
      status.textContent = 'Aplicando…';
      try { status.textContent = await this.execute(command, args); } catch (error) { status.textContent = error.message; }
    };
    const section = title => { const box = node('section', '', 'admin-section'); box.append(node('h3', title)); content.append(box); return box; };
    const tabs = {};
    const show = kind => {
      content.replaceChildren(); status.textContent = '';
      for (const [key, b] of Object.entries(tabs)) b.setAttribute('aria-pressed', String(key === kind));
      if (kind === 'game') {
        let g; try { g = this.game(); } catch (error) { content.append(node('p', error.message)); return; }
        const p = g.player;
        content.append(node('p', 'Privilégios valem nesta partida de treino. Seus resultados não entram no ranking.'));
        const stats = section('Vida e atributos'), grid = node('div', '', 'admin-grid'); stats.append(grid);
        const inputs = {
          maxHp: field(grid, 'Vida máxima', p.maxHp, { min: 1 }), hp: field(grid, 'Vida atual', p.hp, { min: 1 }),
          speed: field(grid, 'Velocidade', Math.round(p.speed), { min: 10, max: 1500 }),
          damage: field(grid, 'Multiplicador de dano', p.mods.damage, { min: 0.1, max: 100 }),
          rate: field(grid, 'Velocidade dos ataques', p.mods.rate, { min: 0.1, max: 20 }),
          area: field(grid, 'Área das habilidades', p.mods.area, { min: 0.1, max: 10 }),
          range: field(grid, 'Alcance das habilidades', p.mods.range, { min: 0.1, max: 10 }),
        };
        button('Aplicar atributos', () => {
          if (Object.values(inputs).some(i => !i.reportValidity())) return;
          perform('stats', Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, Number(input.value)])));
        }, stats);
        const spawn = section('Criar inimigos');
        const enemy = select(spawn, 'Tipo de inimigo', Object.entries(ENEMIES).map(([id, d]) => [id, d.name]));
        const count = field(spawn, 'Quantidade', 5, { min: 1, max: 240, step: 1 });
        button('Criar ao redor do jogador', () => { if (count.reportValidity()) perform('spawn', { enemy: enemy.value, count: Number(count.value) }); }, spawn);
        const skills = section('Habilidades e experiência');
        const power = select(skills, 'Habilidade', Object.entries(POWERS).map(([id, d]) => [id, d.name]));
        const powerLevel = field(skills, 'Nível da habilidade', 1, { min: 1, max: 8, step: 1 });
        button('Adicionar / alterar habilidade', () => { if (powerLevel.reportValidity()) perform('power', { id: power.value, level: Number(powerLevel.value) }); }, skills);
        button('Maximizar habilidades atuais', () => perform('maxpowers'), skills);
        const level = field(skills, 'Nível do jogador', p.level, { min: 1, max: 100, step: 1 });
        button('Definir nível', () => { if (level.reportValidity()) perform('level', { level: Number(level.value) }); }, skills);
        const xp = field(skills, 'Experiência para adicionar', 100, { min: 0, max: 100000, step: 1 });
        button('Adicionar XP', () => { if (xp.reportValidity()) perform('xp', { amount: Number(xp.value) }); }, skills);
        const actions = section('Controles da partida');
        button('Recuperar toda a vida', () => perform('heal'), actions);
        let god = g.godMode;
        const godButton = button(god ? 'Desligar invencibilidade' : 'Ligar invencibilidade', async () => {
          try { status.textContent = await this.execute('god', { enabled: !god }); god = !god; godButton.textContent = god ? 'Desligar invencibilidade' : 'Ligar invencibilidade'; } catch (e) { status.textContent = e.message; }
        }, actions);
        let spawning = g.spawningEnabled;
        const spawningButton = button(spawning ? 'Pausar hordas' : 'Retomar hordas', async () => {
          try { status.textContent = await this.execute('spawning', { enabled: !spawning }); spawning = !spawning; spawningButton.textContent = spawning ? 'Pausar hordas' : 'Retomar hordas'; } catch (e) { status.textContent = e.message; }
        }, actions);
        button('Limpar inimigos e projéteis', () => perform('clear'), actions);
        button('Pular para o chefe', () => perform('boss'), actions);
        button('Derrotar o chefe', () => perform('killboss'), actions);
        const travel = section('Teletransporte');
        const x = field(travel, 'Posição X', Math.round(p.x), { min: 150, max: 3850, step: 1 });
        const y = field(travel, 'Posição Y', Math.round(p.y), { min: 150, max: 3850, step: 1 });
        button('Teletransportar', () => { if (x.reportValidity() && y.reportValidity()) perform('teleport', { x: Number(x.value), y: Number(y.value) }); }, travel);
      } else if (kind === 'users') {
        const filter = field(content, 'Procurar usuário', '', { type: 'search' });
        const list = node('div', '', 'admin-users'); content.append(list);
        const load = async () => {
          list.textContent = 'Carregando usuários…';
          try {
            const result = await GamePortal.request('/api/admin/users?search=' + encodeURIComponent(filter.value));
            list.replaceChildren();
            for (const user of result.users) {
              const row = node('div', '', 'admin-user-row');
              row.append(node('strong', user.username), node('span', user.role === 'admin' ? 'Administrador' : user.banned ? 'Banido' : 'Ativo'));
              if (user.role !== 'admin') button(user.banned ? 'Desbanir' : 'Banir login', async () => {
                try {
                  await GamePortal.request('/api/admin/ban', { method: 'POST', body: { user_id: user.id, banned: !user.banned, reason: 'Moderação do administrador' } });
                  status.textContent = user.banned ? 'Conta desbanida.' : 'Login banido e sessões encerradas.'; await load();
                } catch (e) { status.textContent = e.message; }
              }, row);
              list.append(row);
            }
            if (!result.users.length) list.textContent = 'Nenhum usuário encontrado.';
          } catch (e) { list.textContent = e.message; }
        };
        button('Buscar', load); load();
      } else {
        content.append(node('p', 'As regras salvas entram em vigor nas próximas partidas.'));
        const settings = GamePortal.settings || {};
        const grid = node('div', '', 'admin-grid'); content.append(grid);
        const fields = {
          healthDropChance: field(grid, 'Chance de cura (%)', (settings.healthDropChance ?? 0.05) * 100, { min: 0, max: 100 }),
          bossTime: field(grid, 'Chefe após (segundos)', settings.bossTime ?? 900, { min: 10, max: 3600 }),
          spawnBaseRate: field(grid, 'Inimigos por segundo', settings.spawnBaseRate ?? 1.1, { min: 0, max: 20 }),
          spawnGrowth: field(grid, 'Aumento das hordas por segundo', settings.spawnGrowth ?? 0.0115, { min: 0, max: 0.1 }),
          maxEnemies: field(grid, 'Máximo de inimigos', settings.maxEnemies ?? 240, { min: 1, max: 240, step: 1 }),
        };
        button('Salvar regras', async () => {
          if (Object.values(fields).some(input => !input.reportValidity())) return;
          const body = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, Number(input.value)])); body.healthDropChance /= 100;
          try { const result = await GamePortal.request('/api/admin/settings', { method: 'POST', body }); GamePortal.settings = result.settings; status.textContent = 'Regras salvas para as próximas partidas.'; } catch (e) { status.textContent = e.message; }
        });
      }
    };
    for (const [key, label] of [['game', 'Partida'], ['users', 'Usuários'], ['rules', 'Regras do jogo']]) tabs[key] = button(label, () => show(key), nav);
    button('Fechar', dialog.close, dialog.footer);
    show('game');
  },
};
