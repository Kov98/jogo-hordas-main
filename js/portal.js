// Optional accounts and rankings. The game remains playable without the API.
(() => {
  'use strict';
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const apiOrigin = localHost && location.port === '5500'
    ? `${location.protocol}//${location.hostname}:5501` : location.origin;
  const defaults = { healthDropChance: 0.05, bossTime: 900, spawnBaseRate: 1.1, spawnGrowth: 0.0115, maxEnemies: 240 };
  const guestProgressKey = 'muralha.guest.progress.v1';
  const emptyProgress = () => ({ castle_unlocked: false, forest_clears: 0, castle_clears: 0,
    catacombs_unlocked: false, catacombs_clears: 0 });
  const emptyStats = () => ({ runs: 0, victories: 0, kills: 0, damage: 0, points: 0, best_points: 0 });
  const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const cleanProgress = (value) => ({ castle_unlocked: value?.castle_unlocked === true,
    forest_clears: count(value?.forest_clears), castle_clears: count(value?.castle_clears),
    catacombs_unlocked: value?.catacombs_unlocked === true || count(value?.castle_clears)>0,
    catacombs_clears: count(value?.catacombs_clears) });
  const cleanStats = (value) => Object.fromEntries(Object.keys(emptyStats()).map(key => [key, count(value?.[key])]));
  let guestProgress = emptyProgress();
  try { guestProgress = cleanProgress(JSON.parse(localStorage.getItem(guestProgressKey))); } catch (_) { /* Storage is optional. */ }
  const dialogs = [];
  let root, toolbar, identity, connection, notices;
  let offered = false, online = true, initialized = false, sessionPending = null;
  let lock = null, dialogId = 0, lastToolbar = '';
  let sessionVersion = 0;
  let profileVersion = 0;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const button = (label, action, className = '') => {
    const node = element('button', `portal-button ${className}`, label);
    node.type = 'button';
    if (action) node.addEventListener('click', action);
    return node;
  };
  const game = () => window.GAME;
  const scene = (key) => {
    try { return game()?.scene?.getScene(key); } catch (_) { return null; }
  };
  const active = (key) => {
    try { return !!game()?.scene?.isActive(key); } catch (_) { return false; }
  };
  const paused = (key) => {
    try { return !!game()?.scene?.isPaused(key); } catch (_) { return false; }
  };
  const cinematicActive = () => (active('Game') || paused('Game')) && !!(scene('Game')?.cinematic || scene('Game')?.finale) && !active('End');

  function updateToolbar() {
    if (!toolbar) return;
    const mode = active('End') ? 'end' : (active('Game') || paused('Game')) ? 'game'
      : ['Menu', 'Select', 'StageSelect', 'Difficulty'].some(active) ? 'menu' : '';
    toolbar.hidden = !mode || active('Intro') || cinematicActive();
    toolbar.dataset.mode = mode;
    const signature = `${portal.user?.id}|${portal.user?.username}|${portal.user?.role}|${online}`;
    if (signature === lastToolbar) return;
    lastToolbar = signature;
    identity.replaceChildren();
    identity.append(button(portal.user ? portal.user.username : 'Entrar / Criar conta', () => portal.openLogin(), 'portal-identity'));
    if (portal.isAdmin) {
      const admin = button('Admin · F2', openAdmin, 'portal-admin');
      admin.title = 'Abrir ferramentas de administração (F2)';
      identity.append(admin);
    }
    connection.textContent = online ? (portal.user ? (portal.isAdmin ? 'Administrador · fora do ranking' : 'Conta conectada') : 'Modo convidado')
      : portal.user ? 'Conta offline · progresso preservado' : 'Contas offline · convidado disponível';
    connection.classList.toggle('portal-offline', !online);
  }

  function profileSignature() {
    return JSON.stringify({ user: portal.user, settings: portal.settings, progress: portal.getProgress(), stats: portal.stats });
  }

  function profileChanged(previous) {
    updateToolbar();
    if (previous === profileSignature()) return;
    for (const dialog of [...dialogs]) if (dialog.view === 'account') showAccount(dialog);
    window.dispatchEvent(new CustomEvent('muralha-session', {
      detail: { user: portal.user, settings: { ...portal.settings }, progress: portal.getProgress(), stats: { ...portal.stats } },
    }));
  }

  // Run endpoints return profile fragments; they must not replace the session.
  function applyProfile(data, version) {
    if (version !== sessionVersion || !portal.user) return;
    profileVersion++;
    const previous = profileSignature();
    if (data?.progress && typeof data.progress === 'object') portal.progress = cleanProgress(data.progress);
    if (data?.stats && typeof data.stats === 'object') portal.stats = cleanStats(data.stats);
    if (data?.settings && typeof data.settings === 'object') portal.settings = { ...defaults, ...data.settings };
    profileChanged(previous);
  }

  function applySession(data) {
    const signature = profileSignature();
    const previous = portal.user;
    const previousCsrf = portal.csrf;
    const candidate = data?.user;
    portal.user = candidate && typeof candidate.username === 'string' && candidate.id != null
      ? { id: candidate.id, username: candidate.username, role: candidate.role } : null;
    portal.csrf = portal.user && typeof data?.csrf === 'string' ? data.csrf : null;
    const sameUser = previous?.id === portal.user?.id && !!previous === !!portal.user;
    if (!sameUser || previousCsrf !== portal.csrf || previous?.role !== portal.user?.role) sessionVersion++;
    if (!portal.user || !sameUser) { portal.progress = emptyProgress(); portal.stats = emptyStats(); }
    if (portal.user && data?.progress && typeof data.progress === 'object') portal.progress = cleanProgress(data.progress);
    if (portal.user && data?.stats && typeof data.stats === 'object') portal.stats = cleanStats(data.stats);
    if (data?.settings && typeof data.settings === 'object') portal.settings = { ...defaults, ...data.settings };
    if (previous?.role === 'admin' && !portal.isAdmin) [...dialogs].reverse().forEach((dialog) => dialog.close());
    profileChanged(signature);
  }

  async function request(path, options = {}) {
    if (typeof path !== 'string' || !path.startsWith('/api/')) throw new Error('Caminho de API inválido.');
    let url;
    try { url = new URL(path, apiOrigin); } catch (_) { throw new Error('Abra o jogo pelo servidor local para acessar as contas.'); }
    if (url.origin !== apiOrigin || !url.pathname.startsWith('/api/')) throw new Error('Caminho de API inválido.');
    const method = (options.method || 'GET').toUpperCase();
    const version = sessionVersion;
    const headers = { Accept: 'application/json' };
    const init = { method, credentials: 'include', headers };
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.body);
    }
    if (method !== 'GET' && method !== 'HEAD' && portal.csrf) headers['X-CSRF-Token'] = portal.csrf;
    const controller = new AbortController();
    init.signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(url.href, init);
    } catch (_) {
      online = false;
      updateToolbar();
      const error = new Error('Servidor de contas indisponível. Inicie INICIAR-JOGO.sh e tente novamente. Você pode jogar como convidado.');
      error.status = 0;
      throw error;
    } finally { clearTimeout(timeout); }
    online = true;
    updateToolbar();
    let data;
    try { data = await response.json(); } catch (_) {
      const error = new Error('O servidor de contas não retornou uma resposta válida. Use INICIAR-JOGO.sh para iniciar o jogo.');
      error.status = response.status;
      if (response.status === 401 && version === sessionVersion) applySession({ user: null, csrf: null });
      throw error;
    }
    if (!response.ok) {
      const hadSession = !!portal.user;
      const invalidated = response.status === 401 && version === sessionVersion;
      if (invalidated) applySession({ user: null, csrf: null });
      const error = new Error(typeof data?.error === 'string' ? data.error : `Não foi possível concluir a solicitação (${response.status}).`);
      error.status = response.status;
      if (hadSession && invalidated) portal.notice(error.message);
      throw error;
    }
    return data;
  }

  function refreshSession() {
    if (sessionPending) return sessionPending;
    const version = sessionVersion;
    const revision = profileVersion;
    sessionPending = request('/api/session').then((data) => {
      if (version === sessionVersion) {
        const sameIdentity = data?.user?.id === portal.user?.id && data?.user?.role === portal.user?.role && data?.csrf === portal.csrf;
        // Uma consulta anterior ao avanço/final não desfaz o perfil já confirmado.
        if (revision === profileVersion || !sameIdentity) applySession(data);
      }
      return data;
    }).finally(() => { sessionPending = null; });
    return sessionPending;
  }

  function blockInput() {
    if (!lock) return;
    const current = game();
    const inputs = [current?.input, current?.input?.keyboard];
    const list = current?.scene?.scenes || [];
    for (const item of list) inputs.push(item?.input, item?.input?.keyboard);
    for (const input of inputs) {
      if (!input || lock.inputs.has(input)) continue;
      lock.inputs.set(input, input.enabled);
      input.resetKeys?.();
      input.enabled = false;
    }
    const running = scene('Game');
    const ui = scene('UI');
    if (!lock.pausedScene && running && active('Game') && !active('End') && !running.ended && !running.levelUpOpen && !ui?.paused && !ui?.lvlActive) {
      lock.pausedScene = running;
      lock.onShutdown = () => { if (lock?.pausedScene === running) lock.pausedScene = null; };
      running.events?.once('shutdown', lock.onShutdown);
      current.scene.pause('Game');
    }
    if (running?.joy) { running.joy.active = false; running.joy.x = 0; running.joy.y = 0; }
  }

  function acquireInput() {
    if (lock) return;
    const canvasRoot = document.getElementById('game');
    lock = { inputs: new Map(), pausedScene: null, onShutdown: null, canvasRoot, inert: canvasRoot?.inert };
    if (canvasRoot) canvasRoot.inert = true;
    document.body.classList.add('portal-dialog-open');
    blockInput();
  }

  function releaseInput() {
    if (!lock) return;
    const saved = lock;
    lock = null;
    for (const [input, enabled] of saved.inputs) {
      input.resetKeys?.();
      input.enabled = enabled;
    }
    if (saved.canvasRoot) saved.canvasRoot.inert = saved.inert;
    document.body.classList.remove('portal-dialog-open');
    const running = scene('Game');
    const ui = scene('UI');
    if (saved.pausedScene) {
      saved.pausedScene.events?.off('shutdown', saved.onShutdown);
      if (running === saved.pausedScene && paused('Game') && !active('End') && !running.ended && !running.levelUpOpen && !ui?.paused && !ui?.lvlActive) game().scene.resume('Game');
    }
  }

  function openDialog(title) {
    if (cinematicActive()) return null;
    if (!initialized) initDOM();
    const previousFocus = document.activeElement;
    const overlay = element('div', 'portal-overlay');
    const panel = element('section', 'portal-dialog');
    const header = element('header', 'portal-dialog-header');
    const heading = element('h2', '', title);
    heading.id = `portal-dialog-${++dialogId}`;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', heading.id);
    panel.tabIndex = -1;
    const body = element('div', 'portal-dialog-body');
    const footer = element('footer', 'portal-dialog-footer');
    let closed = false;
    const dialog = { body, footer, close() {
      if (closed) return;
      closed = true;
      const index = dialogs.indexOf(dialog);
      if (index !== -1) dialogs.splice(index, 1);
      overlay.remove();
      const top = dialogs[dialogs.length - 1];
      if (top) { top.panel.removeAttribute('aria-hidden'); top.panel.inert = false; top.panel.focus({ preventScroll: true }); }
      else {
        releaseInput();
        // A barra de contas intercepta teclas enquanto seus botões têm foco.
        // Ao voltar à partida, o teclado deve pertencer novamente ao canvas.
        const canvas = game()?.canvas;
        if (canvas?.isConnected) {
          if (canvas.tabIndex < 0) canvas.tabIndex = 0;
          canvas.focus({ preventScroll: true });
        } else if (previousFocus?.isConnected && !previousFocus.closest('[hidden]')) previousFocus.focus({ preventScroll: true });
      }
    }, panel };
    const closeButton = button('×', dialog.close, 'portal-close');
    closeButton.setAttribute('aria-label', 'Fechar diálogo');
    header.append(heading, closeButton);
    panel.append(header, body, footer);
    overlay.append(panel);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) dialog.close(); });
    const previous = dialogs[dialogs.length - 1];
    if (previous) { previous.panel.setAttribute('aria-hidden', 'true'); previous.panel.inert = true; }
    dialogs.push(dialog);
    acquireInput();
    root.append(overlay);
    queueMicrotask(() => {
      if (!closed && dialogs[dialogs.length - 1] === dialog) (body.querySelector('input, select, textarea, button, [tabindex="0"]') || panel).focus({ preventScroll: true });
    });
    return dialog;
  }

  function field(form, label, name, type, minimum, maximum, autocomplete) {
    const group = element('label', 'portal-field');
    group.append(element('span', '', label));
    const input = element('input');
    Object.assign(input, { name, type, required: true, minLength: minimum, maxLength: maximum, autocomplete });
    if (name === 'username') { input.autocapitalize = 'none'; input.spellcheck = false; }
    group.append(input);
    form.append(group);
    return input;
  }

  function showPassword(dialog) {
    dialog.view = 'password';
    dialog.body.replaceChildren();
    dialog.footer.replaceChildren(button('Voltar à conta', () => showAccount(dialog)));
    dialog.body.append(element('p', 'portal-muted', 'Escolha uma senha de 8 a 128 caracteres.'));
    const form = element('form', 'portal-form');
    form.noValidate = true;
    const current = field(form, 'Senha atual', 'currentPassword', 'password', 8, 128, 'current-password');
    const next = field(form, 'Nova senha', 'newPassword', 'password', 8, 128, 'new-password');
    const message = element('p', 'portal-form-message');
    message.setAttribute('role', 'alert');
    const submit = button('Alterar senha', null, 'portal-primary');
    submit.type = 'submit';
    form.append(message, submit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      if (current.value.length < 8 || current.value.length > 128 || next.value.length < 8 || next.value.length > 128) { message.textContent = 'As senhas devem ter de 8 a 128 caracteres.'; return; }
      submit.disabled = true;
      message.textContent = 'Alterando senha…';
      try {
        await request('/api/password', { method: 'POST', body: { currentPassword: current.value, newPassword: next.value } });
        current.value = ''; next.value = '';
        portal.notice('Senha alterada.');
        showAccount(dialog);
      } catch (error) { message.textContent = error.message; }
      finally { submit.disabled = false; }
    });
    dialog.body.append(form);
    current.focus();
  }

  function showAccount(dialog) {
    dialog.view = 'account';
    dialog.body.replaceChildren();
    dialog.footer.replaceChildren(button('Fechar', dialog.close));
    if (!portal.user) { dialog.close(); return; }
    dialog.body.append(element('p', 'portal-account-name', portal.user.username));
    dialog.body.append(element('p', 'portal-muted', portal.isAdmin ? 'Conta administrativa. Suas partidas ficam fora do ranking.' : 'Suas melhores partidas podem entrar no ranking da muralha.'));
    const table = (label, rows) => {
      dialog.body.append(element('h3', 'portal-muted', label));
      const scroll = element('div', 'portal-table-scroll');
      const content = element('table', 'portal-table');
      content.setAttribute('aria-label', label);
      const body = element('tbody');
      for (const [name, value] of rows) {
        const row = element('tr');
        const heading = element('th', '', name); heading.scope = 'row';
        row.append(heading, element('td', '', value)); body.append(row);
      }
      content.append(body); scroll.append(content); dialog.body.append(scroll);
    };
    const progress = portal.getProgress();
    table('Suas estatísticas', [['Partidas', portal.stats.runs], ['Vitórias', portal.stats.victories], ['Abates', portal.stats.kills],
      ['Dano', portal.stats.damage], ['Pontos', portal.stats.points], ['Melhor partida', portal.stats.best_points]].map(([label, value]) => [label, number(value)]));
    table('Suas fases', [
      ['Floresta', `Disponível · ${number(progress.forest_clears)} conclusões`],
      ['Castelo', portal.canPlayStage('castle') ? `Liberado · ${number(progress.castle_clears)} conclusões` : 'Bloqueado · conclua a Floresta'],
      ['Inferno', portal.canPlayStage('catacombs') ? `Liberado · ${number(progress.catacombs_clears)} conclusões` : 'Bloqueado · conclua o Castelo'],
    ]);
    const actions = element('div', 'portal-account-actions');
    const logout = button('Sair da conta', async () => {
      logout.disabled = true;
      try {
        await request('/api/logout', { method: 'POST', body: {} });
        applySession({ user: null, csrf: null });
        dialog.close();
        portal.notice('Você está jogando como convidado.');
      } catch (error) { portal.notice(error.message); logout.disabled = false; }
    });
    actions.append(button('Alterar senha', () => showPassword(dialog)), logout);
    dialog.body.append(actions);
  }

  function openLogin() {
    if (cinematicActive()) return;
    const dialog = openDialog(portal.user ? 'Minha conta' : 'Entre na muralha');
    if (portal.user) { showAccount(dialog); return dialog; }
    if (!online) refreshSession().then(() => { if (portal.user && dialog.panel.isConnected) showAccount(dialog); }).catch(() => {});
    dialog.body.append(element('p', 'portal-muted', 'Entrar é opcional. Crie uma conta para registrar suas melhores partidas ou continue como convidado.'));
    const switches = element('div', 'portal-switches');
    const form = element('form', 'portal-form');
    form.noValidate = true;
    const username = field(form, 'Nome de usuário', 'username', 'text', 3, 20, 'username');
    const password = field(form, 'Senha', 'password', 'password', 8, 128, 'current-password');
    const hint = element('p', 'portal-muted portal-hint', 'Nome: 3 a 20 caracteres. Senha: 8 a 128 caracteres.');
    const message = element('p', 'portal-form-message');
    message.setAttribute('role', 'alert');
    const submit = button('Entrar', null, 'portal-primary');
    submit.type = 'submit';
    let register = false;
    const choose = (value) => {
      register = value;
      loginButton.setAttribute('aria-pressed', String(!value));
      registerButton.setAttribute('aria-pressed', String(value));
      submit.textContent = value ? 'Criar conta' : 'Entrar';
      password.autocomplete = value ? 'new-password' : 'current-password';
      message.textContent = '';
    };
    const loginButton = button('Entrar', () => choose(false));
    const registerButton = button('Criar conta', () => choose(true));
    switches.append(loginButton, registerButton);
    switches.setAttribute('aria-label', 'Entrar ou criar conta');
    choose(false);
    form.append(hint, message, submit);
    dialog.body.append(switches, form);
    dialog.footer.append(button('Continuar como convidado', dialog.close, 'portal-guest'));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      const name = username.value.trim();
      if (name.length < 3 || name.length > 20) { message.textContent = 'O nome deve ter de 3 a 20 caracteres.'; username.focus(); return; }
      if (password.value.length < 8 || password.value.length > 128) { message.textContent = 'A senha deve ter de 8 a 128 caracteres.'; password.focus(); return; }
      submit.disabled = true; loginButton.disabled = true; registerButton.disabled = true;
      message.textContent = register ? 'Criando conta…' : 'Entrando…';
      try {
        await portal.ready;
        const data = await request(register ? '/api/register' : '/api/login', { method: 'POST', body: { username: name, password: password.value } });
        password.value = '';
        applySession(data);
        dialog.close();
        portal.notice(`Bem-vindo, ${portal.user?.username || name}.`);
      } catch (error) { message.textContent = error.message; }
      finally { submit.disabled = false; loginButton.disabled = false; registerButton.disabled = false; }
    });
    return dialog;
  }

  const number = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value) || 0);
  function openLeaderboard() {
    if (cinematicActive()) return;
    const dialog = openDialog('Ranking da muralha');
    dialog.panel.classList.add('portal-dialog-wide');
    dialog.body.append(element('p', 'portal-muted', 'Melhor partida de cada conta. Administradores e contas suspensas ficam fora da classificação.'));
    const switches = element('div', 'portal-switches');
    switches.setAttribute('aria-label', 'Ordenar ranking');
    const results = element('div', 'portal-ranking-results');
    results.setAttribute('aria-live', 'polite');
    const tabs = [];
    const filter = element('label', 'portal-field', 'Dificuldade');
    const difficulty = document.createElement('select');
    difficulty.setAttribute('aria-label', 'Dificuldade do ranking');
    for (const d of Object.values(DIFFICULTIES)) {
      const option = element('option', '', d.name); option.value = d.id; difficulty.append(option);
    }
    difficulty.value = scene('Game')?.difficultyId || game()?.registry.get('difficulty') || 'medium';
    filter.append(difficulty);
    const stageFilter = element('label', 'portal-field', 'Percurso');
    const stage = document.createElement('select'); stage.setAttribute('aria-label', 'Percurso do ranking');
    for (const [id, name] of [['forest', 'Campanha — três fases'], ['castle', 'Castelo → Inferno'], ['catacombs', 'Inferno — fase final']]) {
      const option = element('option', '', name); option.value = id; stage.append(option);
    }
    stage.value = scene('Game')?.startStageId || 'forest'; stageFilter.append(stage);
    let selectedSort = 'points';
    let serial = 0;
    difficulty.addEventListener('change', () => load(selectedSort));
    stage.addEventListener('change', () => load(selectedSort));
    const load = async (sort) => {
      selectedSort = sort;
      const current = ++serial;
      for (const [key, tab] of tabs) tab.setAttribute('aria-pressed', String(key === sort));
      results.replaceChildren(element('p', 'portal-muted', 'Carregando ranking…'));
      try {
        const data = await request(`/api/leaderboard?sort=${sort}&difficulty=${encodeURIComponent(difficulty.value)}&stage=${encodeURIComponent(stage.value)}`);
        if (serial !== current || !dialog.panel.isConnected) return;
        results.replaceChildren();
        if (!Array.isArray(data.entries) || !data.entries.length) { results.append(element('p', 'portal-empty', 'A muralha ainda espera seus primeiros recordistas.')); return; }
        const scroll = element('div', 'portal-table-scroll');
        scroll.tabIndex = 0;
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', 'Classificação de jogadores. Role para ver todas as colunas.');
        const table = element('table', 'portal-table');
        const caption = element('caption', 'portal-sr-only', `Ranking por ${sort === 'points' ? 'pontos' : sort === 'kills' ? 'abates' : 'dano'}`);
        const head = element('thead');
        const row = element('tr');
        for (const label of ['#', 'Jogador', 'Pontos', 'Abates', 'Dano', 'Tempo', 'Resultado']) { const th = element('th', '', label); th.scope = 'col'; row.append(th); }
        head.append(row);
        const body = element('tbody');
        data.entries.slice(0, 50).forEach((entry, index) => {
          const tr = element('tr');
          const seconds = Math.max(0, Math.floor(Number(entry.duration) || 0));
          const values = [entry.rank ?? index + 1, entry.username, number(entry.points), number(entry.kills), number(entry.damage), `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, entry.victory ? 'Vitória' : 'Derrota'];
          for (const value of values) tr.append(element('td', '', value ?? '—'));
          body.append(tr);
        });
        table.append(caption, head, body); scroll.append(table); results.append(scroll);
      } catch (error) {
        if (serial !== current || !dialog.panel.isConnected) return;
        results.replaceChildren(element('p', 'portal-form-message', error.message), button('Tentar novamente', () => load(sort)));
      }
    };
    for (const [key, label] of [['points', 'Pontos'], ['kills', 'Abates'], ['damage', 'Dano']]) {
      const tab = button(label, () => load(key)); tabs.push([key, tab]); switches.append(tab);
    }
    dialog.body.append(stageFilter, filter, switches, results);
    dialog.footer.append(button('Fechar', dialog.close));
    load('points');
    return dialog;
  }

  function openAdmin() {
    if (cinematicActive()) return;
    if (!portal.isAdmin) return;
    if (window.GameAdmin?.open) window.GameAdmin.open();
    else portal.notice('O painel de administração ainda não está disponível.');
  }

  function handleKeyboard(event) {
    const top = dialogs[dialogs.length - 1];
    if (!top) {
      if (cinematicActive()) {
        if (event.type === 'keydown' && ['g', 'f2'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); }
        return;
      }
      if (event.type === 'keydown' && event.key.toLowerCase() === 'g' && !active('Intro')) {
        const tag = document.activeElement?.tagName;
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) && window.PowerGuide) {
          event.preventDefault(); event.stopImmediatePropagation(); window.PowerGuide.open(); return;
        }
      }
      if (event.type === 'keydown' && event.key === 'F2' && portal.isAdmin) { event.preventDefault(); event.stopImmediatePropagation(); openAdmin(); }
      return;
    }
    if (event.type !== 'keydown') return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); top.close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...top.panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')].filter((node) => !node.disabled && node.tabIndex >= 0 && !node.hidden && node.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { event.preventDefault(); top.panel.focus(); }
    else if (event.shiftKey && (document.activeElement === first || !top.panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !top.panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    event.stopImmediatePropagation();
  }

  function initDOM() {
    if (initialized || !document.body) return;
    initialized = true;
    root = element('div', 'portal-root');
    root.id = 'portal-root';
    toolbar = element('nav', 'portal-toolbar');
    toolbar.hidden = true;
    toolbar.setAttribute('aria-label', 'Conta e ranking');
    identity = element('div', 'portal-toolbar-actions');
    connection = element('span', 'portal-connection');
    toolbar.append(connection, identity, button('Ranking', openLeaderboard), button('Grimório · G', () => window.PowerGuide?.open()));
    notices = element('div', 'portal-notices');
    notices.setAttribute('role', 'status');
    notices.setAttribute('aria-live', 'polite');
    root.append(toolbar, notices);
    for (const type of ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'click', 'wheel']) root.addEventListener(type, (event) => event.stopPropagation());
    document.body.append(root);
    window.addEventListener('keydown', handleKeyboard, true);
    window.addEventListener('keyup', handleKeyboard, true);
    for (const type of ['keydown', 'keyup', 'keypress']) document.addEventListener(type, (event) => { if (dialogs.length || root.contains(event.target)) event.stopImmediatePropagation(); });
    setInterval(() => { updateToolbar(); if (dialogs.length) blockInput(); }, 200);
    setInterval(() => { if (portal.user && !document.hidden) refreshSession().catch(() => {}); }, 15000);
    const recheck = () => { if (!document.hidden && (portal.user || !online)) refreshSession().catch(() => {}); };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    updateToolbar();
  }

  const portal = window.GamePortal = {
    user: null,
    csrf: null,
    progress: emptyProgress(),
    stats: emptyStats(),
    settings: { ...defaults },
    get dialogOpen() { return dialogs.length > 0; },
    get isAdmin() { return this.user?.role === 'admin'; },
    request,
    openDialog,
    openLogin,
    openLeaderboard,
    getProgress() { return { ...(this.user ? this.progress : guestProgress) }; },
    canPlayStage(id) {
      return id === 'forest' || (id === 'castle' && (this.isAdmin || this.getProgress().castle_unlocked)) ||
        (id === 'catacombs' && (this.isAdmin || this.getProgress().catacombs_unlocked));
    },
    recordGuestAdvance(target = 'castle', originKey) {
      if (originKey !== undefined ? originKey !== 'guest' : !!this.user) return this.getProgress();
      if (!['castle', 'catacombs'].includes(target)) return this.getProgress();
      const previous = profileSignature();
      guestProgress = target === 'castle'
        ? { ...guestProgress, castle_unlocked: true, forest_clears: guestProgress.forest_clears + 1 }
        : { ...guestProgress, castle_unlocked: true, catacombs_unlocked: true, castle_clears: guestProgress.castle_clears + 1 };
      try { localStorage.setItem(guestProgressKey, JSON.stringify(guestProgress)); } catch (_) { /* Retain the in-memory guest profile. */ }
      profileChanged(previous);
      return this.getProgress();
    },
    recordGuestVictory(stage = 'catacombs', originKey) {
      if (originKey !== undefined ? originKey !== 'guest' : !!this.user) return this.getProgress();
      const previous = profileSignature();
      const field = stage === 'castle' ? 'castle_clears' : 'catacombs_clears';
      guestProgress = { ...guestProgress, castle_unlocked: true, catacombs_unlocked: true, [field]: guestProgress[field] + 1 };
      try { localStorage.setItem(guestProgressKey, JSON.stringify(guestProgress)); } catch (_) { /* Retain the in-memory guest profile. */ }
      profileChanged(previous);
      return this.getProgress();
    },
    notice(text) {
      if (!initialized) initDOM();
      if (!notices) return;
      const node = element('p', 'portal-notice', text);
      notices.append(node);
      while (notices.children.length > 3) notices.firstElementChild.remove();
      setTimeout(() => node.remove(), 7000);
    },
    offerLogin() {
      if (offered) return;
      offered = true;
      return this.ready.then(() => { if (!this.user) return this.openLogin(); });
    },
    async beginRun(hero, practice = false, difficulty = 'medium', stage = 'forest') {
      await this.ready;
      if (!this.user) {
        // Convidados também recebem as regras atuais ao começar outra partida.
        if (online) { try { await refreshSession(); } catch (_) { /* Offline continua jogável. */ } }
        if (!this.user) return { run_id: null, ranked: false, settings: { ...this.settings }, difficulty, stage, profile_key:'guest' };
      }
      const profileKey='user.'+this.user.id;
      try { return {...await request('/api/runs/start', { method: 'POST', body: { hero, practice: !!practice, difficulty, stage } }),profile_key:profileKey}; }
      catch (error) { this.notice(error.message); return { run_id: null, ranked: false, error: error.message, status: error.status,profile_key:profileKey }; }
    },
    async advanceRun(runId, targetStage = 'castle') {
      const version = sessionVersion;
      const data = await request('/api/runs/advance', { method: 'POST', body: { run_id: runId, stage: targetStage } });
      applyProfile(data, version);
      return data;
    },
    async finishRun(payload) {
      if (!payload?.run_id || !this.user) return { saved: false, ranked: false, points: 0 };
      const version = sessionVersion;
      try {
        const data = await request('/api/runs/finish', { method: 'POST', body: payload });
        applyProfile(data, version);
        return data;
      }
      catch (error) { this.notice(error.message); return { saved: false, ranked: false, points: 0 }; }
    },
  };
  portal.ready = (async () => {
    if (!document.body) await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    initDOM();
    try { await refreshSession(); } catch (_) { /* Guest mode does not depend on the server. */ }
    return portal;
  })();
})();
