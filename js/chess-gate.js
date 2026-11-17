/* Chess piece images: Cburnett set (CC BY-SA 3.0 / GPL), via the Lichess repository. */
(() => {
  'use strict';

  const gate = document.getElementById('chess-gate');
  if (!gate) return;

  try {
    if (sessionStorage.getItem('chessGateSolved') === '1') {
      gate.remove();
      return;
    }
  } catch (e) { /* storage unavailable, show the gate */ }

  /* ---------------- Minimal chess engine (no castling / en passant) ---------------- */
  // Board: array of 64, index 0 = a8 ... 63 = h1. Pieces: 'P','N','B','R','Q','K' white, lowercase black.
  const isWhite = p => p && p === p.toUpperCase();
  const colorOf = p => (isWhite(p) ? 'w' : 'b');

  function parseFen(fen) {
    const [rows, turn] = fen.split(' ');
    const board = [];
    for (const row of rows.split('/')) {
      for (const ch of row) {
        if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push(null);
        else board.push(ch);
      }
    }
    return { board, turn };
  }

  const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function attacked(board, sq, by) {
    const f = sq % 8, r = Math.floor(sq / 8);
    const at = (df, dr) => {
      const nf = f + df, nr = r + dr;
      return nf < 0 || nf > 7 || nr < 0 || nr > 7 ? undefined : board[nr * 8 + nf];
    };
    const own = ch => (by === 'w' ? ch : ch.toLowerCase());
    // pawns: white pawns attack upward (toward row 0), so they sit one row below the target
    const pd = by === 'w' ? 1 : -1;
    for (const df of [-1, 1]) if (at(df, pd) === own('P')) return true;
    for (const [df, dr] of KNIGHT) if (at(df, dr) === own('N')) return true;
    for (const [df, dr] of KING) if (at(df, dr) === own('K')) return true;
    for (const [df, dr] of DIAG) {
      for (let k = 1; k < 8; k++) {
        const p = at(df * k, dr * k);
        if (p === undefined) break;
        if (p) { if (p === own('B') || p === own('Q')) return true; break; }
      }
    }
    for (const [df, dr] of ORTH) {
      for (let k = 1; k < 8; k++) {
        const p = at(df * k, dr * k);
        if (p === undefined) break;
        if (p) { if (p === own('R') || p === own('Q')) return true; break; }
      }
    }
    return false;
  }

  function pseudoMoves(board, turn) {
    const moves = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = board[sq];
      if (!p || colorOf(p) !== turn) continue;
      const f = sq % 8, r = Math.floor(sq / 8);
      const t = p.toUpperCase();
      const push = (nf, nr) => {
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) return false;
        const to = nr * 8 + nf, q = board[to];
        if (q && colorOf(q) === turn) return false;
        moves.push({ from: sq, to });
        return !q;
      };
      if (t === 'P') {
        const dir = turn === 'w' ? -1 : 1;
        const startRow = turn === 'w' ? 6 : 1;
        if (r + dir >= 0 && r + dir <= 7 && !board[(r + dir) * 8 + f]) {
          moves.push({ from: sq, to: (r + dir) * 8 + f });
          if (r === startRow && !board[(r + 2 * dir) * 8 + f]) moves.push({ from: sq, to: (r + 2 * dir) * 8 + f });
        }
        for (const df of [-1, 1]) {
          const nf = f + df, nr = r + dir;
          if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
          const q = board[nr * 8 + nf];
          if (q && colorOf(q) !== turn) moves.push({ from: sq, to: nr * 8 + nf });
        }
      } else if (t === 'N') {
        for (const [df, dr] of KNIGHT) push(f + df, r + dr);
      } else if (t === 'K') {
        for (const [df, dr] of KING) push(f + df, r + dr);
      } else {
        const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
        for (const [df, dr] of dirs) for (let k = 1; k < 8; k++) if (!push(f + df * k, r + dr * k)) break;
      }
    }
    return moves;
  }

  function applyMove(board, m) {
    const b = board.slice();
    let p = b[m.from];
    const lastRow = isWhite(p) ? 0 : 7;
    if (p.toUpperCase() === 'P' && Math.floor(m.to / 8) === lastRow) p = isWhite(p) ? 'Q' : 'q';
    b[m.to] = p;
    b[m.from] = null;
    return b;
  }

  const other = c => (c === 'w' ? 'b' : 'w');
  const kingSq = (board, c) => board.indexOf(c === 'w' ? 'K' : 'k');

  function legalMoves(board, turn) {
    return pseudoMoves(board, turn).filter(m => {
      const nb = applyMove(board, m);
      return !attacked(nb, kingSq(nb, turn), other(turn));
    });
  }

  const inCheck = (board, turn) => attacked(board, kingSq(board, turn), other(turn));

  // Can `turn` (attacker) force mate within `n` of its own moves? Returns true/false.
  function attackerWins(board, turn, n) {
    if (n === 0) return false;
    for (const m of legalMoves(board, turn)) {
      const nb = applyMove(board, m);
      if (defenderLoses(nb, other(turn), n, turn)) return true;
    }
    return false;
  }

  function defenderLoses(board, defender, n, attacker) {
    const replies = legalMoves(board, defender);
    if (replies.length === 0) return inCheck(board, defender); // mate (stalemate is not a win)
    if (n === 1) return false;
    for (const m of replies) {
      if (!attackerWins(applyMove(board, m), attacker, n - 1)) return false;
    }
    return true;
  }

  // Attacker moves that keep a forced mate within n moves.
  function winningMoves(board, turn, n) {
    return legalMoves(board, turn).filter(m => defenderLoses(applyMove(board, m), other(turn), n, turn));
  }

  // Defender picks the reply that survives longest (ties: first found).
  function defenderReply(board, defender, attacker, n) {
    const replies = legalMoves(board, defender);
    for (let depth = n - 1; depth >= 1; depth--) {
      for (const m of replies) {
        if (!attackerWins(applyMove(board, m), attacker, depth)) return m;
      }
    }
    return replies[0];
  }

  /* ---------------- Puzzle ---------------- */
  const PUZZLES = [
    {
      // Knight and queen sacrifice leading to a smothered mate
      fen: '5r1k/ppp3pp/7N/8/2Q5/8/8/6K1 w',
      n: 2,
      hints: [
        'Black\'s king is boxed in by its own rook and pawns. Think about forcing the rook to capture on the back rank.',
        'Sacrifice the queen with check. Your knight guards the square, so the king cannot take it.',
      ],
      finalHint: 'The king has no squares left. Your knight can deliver the final check.',
    },
  ];
  const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  const start = parseFen(puzzle.fen);
  const attacker = start.turn;
  const defender = other(attacker);

  const NAMES = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
  const pieceImg = p => 'img/pieces/' + (isWhite(p) ? 'w' : 'b') + p.toUpperCase() + '.svg';
  const sqName = i => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));

  /* ---------------- UI ---------------- */
  const boardEl = document.getElementById('cg-board');
  const titleEl = document.getElementById('cg-title');
  const statusEl = document.getElementById('cg-status');
  const hintBtn = document.getElementById('cg-hint');
  const resetBtn = document.getElementById('cg-reset');
  const hintText = document.getElementById('cg-hint-text');

  let board, movesLeft, selected, legalForSel, busy, hintLevel, hintMove, lastMove;

  document.body.classList.add('gate-locked');
  titleEl.textContent = `Find mate in ${puzzle.n} to access this site`;

  function reset() {
    board = start.board.slice();
    movesLeft = puzzle.n;
    selected = null; legalForSel = []; busy = false; hintLevel = 0; hintMove = null; lastMove = null;
    hintText.textContent = '';
    setStatus(`You play ${attacker === 'w' ? 'White' : 'Black'}. Mate in ${puzzle.n}. Move ${1} of ${puzzle.n}.`);
    render();
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.dataset.kind = kind || '';
  }

  function render() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 64; i++) {
      const f = i % 8, r = Math.floor(i / 8);
      const sq = document.createElement('button');
      sq.type = 'button';
      sq.className = 'cg-sq ' + ((f + r) % 2 ? 'dark' : 'light');
      sq.dataset.i = i;
      sq.setAttribute('aria-label', sqName(i) + (board[i] ? ' ' + board[i] : ''));
      if (i === selected) sq.classList.add('sel');
      if (legalForSel.some(m => m.to === i)) sq.classList.add(board[i] ? 'cap' : 'dot');
      if (lastMove && (i === lastMove.from || i === lastMove.to)) sq.classList.add('last');
      if (hintMove && hintLevel >= 2 && i === hintMove.from) sq.classList.add('hint');
      if (hintMove && hintLevel >= 3 && i === hintMove.to) sq.classList.add('hint');
      if (board[i]) {
        const img = document.createElement('img');
        img.className = 'cg-piece';
        img.src = pieceImg(board[i]);
        img.alt = '';
        img.draggable = false;
        sq.appendChild(img);
      }
      if (f === 0) { const c = document.createElement('i'); c.className = 'rk'; c.textContent = 8 - r; sq.appendChild(c); }
      if (r === 7) { const c = document.createElement('i'); c.className = 'fl'; c.textContent = 'abcdefgh'[f]; sq.appendChild(c); }
      boardEl.appendChild(sq);
    }
  }

  function currentWinning() {
    return winningMoves(board, attacker, movesLeft);
  }

  boardEl.addEventListener('click', e => {
    const el = e.target.closest('.cg-sq');
    if (!el || busy) return;
    const i = +el.dataset.i;
    const p = board[i];
    if (selected !== null) {
      const mv = legalForSel.find(m => m.to === i);
      if (mv) { play(mv); return; }
    }
    if (p && colorOf(p) === attacker) {
      selected = i;
      legalForSel = legalMoves(board, attacker).filter(m => m.from === i);
    } else {
      selected = null; legalForSel = [];
    }
    render();
  });

  function play(mv) {
    selected = null; legalForSel = [];
    const good = currentWinning();
    const isGood = good.some(m => m.from === mv.from && m.to === mv.to);
    board = applyMove(board, mv);
    lastMove = mv;
    hintLevel = 0; hintMove = null; hintText.textContent = '';
    render();

    if (!isGood) {
      busy = true;
      setStatus('That does not force mate in time. Resetting the position...', 'bad');
      setTimeout(reset, 1300);
      return;
    }
    movesLeft--;
    const replies = legalMoves(board, defender);
    if (replies.length === 0) {
      if (inCheck(board, defender)) return solved();
      busy = true;
      setStatus('Stalemate! Resetting the position...', 'bad');
      setTimeout(reset, 1300);
      return;
    }
    busy = true;
    setStatus('Black is thinking...');
    setTimeout(() => {
      const reply = defenderReply(board, defender, attacker, movesLeft);
      board = applyMove(board, reply);
      lastMove = reply;
      busy = false;
      setStatus(`Good. Now find mate in ${movesLeft}. Move ${puzzle.n - movesLeft + 1} of ${puzzle.n}.`, 'ok');
      render();
    }, 600);
  }

  function solved() {
    busy = true;
    setStatus('Checkmate! Access granted.', 'win');
    try { sessionStorage.setItem('chessGateSolved', '1'); } catch (e) { /* ignore */ }
    setTimeout(() => {
      gate.classList.add('done');
      document.body.classList.remove('gate-locked');
      setTimeout(() => gate.remove(), 700);
    }, 900);
  }

  hintBtn.addEventListener('click', () => {
    if (busy) return;
    hintLevel = Math.min(hintLevel + 1, 3);
    const good = currentWinning();
    hintMove = good[0];
    if (hintLevel === 1) {
      const staged = movesLeft === 1 ? puzzle.finalHint : puzzle.hints[movesLeft === puzzle.n ? 0 : 1];
      hintText.textContent = 'Hint 1/3: ' + staged;
    } else if (hintLevel === 2) {
      const piece = NAMES[board[hintMove.from].toUpperCase()];
      hintText.textContent = `Hint 2/3: Move the ${piece} on ${sqName(hintMove.from)}.`;
    } else {
      hintText.textContent = `Hint 3/3: ${sqName(hintMove.from)} to ${sqName(hintMove.to)}.`;
    }
    render();
  });

  resetBtn.addEventListener('click', () => { if (!busy || statusEl.dataset.kind !== 'win') reset(); });

  reset();
})();
