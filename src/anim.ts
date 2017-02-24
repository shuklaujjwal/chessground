import * as util from './util'

type Mutation<A> = (state: State) => A;

// transformation is a function
// accepts board state and any number of arguments,
// and mutates the board.
export default function<A>(mutation: Mutation<A>, state: State, skip?: boolean): A {
  if (state.animation.enabled && !skip) return animate(mutation, state);
  else {
    const result = mutation(state);
    state.dom.redraw();
    return result;
  }
}

interface MiniState {
  orientation: Color;
  pieces: Pieces;
}
interface AnimPiece {
  key: Key;
  pos: Pos;
  piece: Piece;
}
interface AnimPieces {
  [key: string]: AnimPiece
}

function makePiece(k: Key, piece: Piece, invert: boolean): AnimPiece {
  const key = invert ? util.invertKey(k) : k;
  return {
    key: key,
    pos: util.key2pos(key),
    piece: piece
  };
}

function samePiece(p1: Piece, p2: Piece): boolean {
  return p1.role === p2.role && p1.color === p2.color;
}

function closer(piece: AnimPiece, pieces: AnimPiece[]): AnimPiece {
  return pieces.sort((p1, p2) => {
    return util.distance(piece.pos, p1.pos) - util.distance(piece.pos, p2.pos);
  })[0];
}

function computePlan(prev: MiniState, current: State): AnimPlan {
  const width = current.dom.bounds.width / 8,
  height = current.dom.bounds.height / 8,
  anims: AnimVectors = {},
  animedOrigs: Key[] = [],
  fadings: AnimFading[] = [],
  missings: AnimPiece[] = [],
  news: AnimPiece[] = [],
  invert = prev.orientation !== current.orientation,
  prePieces: AnimPieces = {},
  white = current.orientation === 'white',
  dropped = current.movable.dropped;
  let curP: Piece, preP: AnimPiece, i: any, key: Key, orig: Pos, dest: Pos, vector: NumberPair;
  for (i in prev.pieces) {
    prePieces[i] = makePiece(i as Key, prev.pieces[i], invert);
  }
  for (i = 0; i < util.allKeys.length; i++) {
    key = util.allKeys[i];
    if (!dropped || key !== dropped[1]) {
      curP = current.pieces[key];
      preP = prePieces[key];
      if (curP) {
        if (preP) {
          if (!samePiece(curP, preP.piece)) {
            missings.push(preP);
            news.push(makePiece(key, curP, false));
          }
        } else
        news.push(makePiece(key, curP, false));
      } else if (preP)
      missings.push(preP);
    }
  }
  news.forEach(newP => {
    preP = closer(newP, missings.filter(p => samePiece(newP.piece, p.piece)));
    if (preP) {
      orig = white ? preP.pos : newP.pos;
      dest = white ? newP.pos : preP.pos;
      vector = [(orig[0] - dest[0]) * width, (dest[1] - orig[1]) * height];
      anims[newP.key] = [vector, vector];
      animedOrigs.push(preP.key);
    }
  });
  missings.forEach(p => {
    if (
      (!dropped || p.key !== dropped[0]) &&
      !util.containsX(animedOrigs, p.key) &&
      !(current.items ? current.items(p.pos, p.key) : false)
    )
    fadings.push({
      pos: p.pos,
      piece: p.piece,
      opacity: 1
    });
  });

  return {
    anims: anims,
    fadings: fadings
  };
}

function roundBy(n: number, by: number): number {
  return Math.round(n * by) / by;
}

function go(state: State): void {
  if (!state.animation.current || !state.animation.current.start) return; // animation was canceled
  const rest = 1 - (new Date().getTime() - state.animation.current.start) / state.animation.current.duration;
  if (rest <= 0) {
    state.animation.current = undefined;
    state.dom.redraw();
  } else {
    let i: any;
    const ease = easing(rest);
    for (i in state.animation.current.plan.anims) {
      const cfg = state.animation.current.plan.anims[i];
      cfg[1] = [roundBy(cfg[0][0] * ease, 10), roundBy(cfg[0][1] * ease, 10)];
    }
    for (i in state.animation.current.plan.fadings) {
      state.animation.current.plan.fadings[i].opacity = roundBy(ease, 100);
    }
    state.dom.redraw();
    util.raf(() => go(state));
  }
}

function animate<A>(mutation: Mutation<A>, state: State): A {
  // clone state before mutating it
  const prev: MiniState = {
    orientation: state.orientation,
    pieces: {} as Pieces
  };
  // clone pieces
  for (let key in state.pieces) {
    prev.pieces[key] = {
      role: state.pieces[key].role,
      color: state.pieces[key].color
    };
  }
  const result = mutation(state);
  if (state.animation.enabled) {
    const plan = computePlan(prev, state);
    if (!isObjectEmpty(plan.anims) || !isObjectEmpty(plan.fadings)) {
      const alreadyRunning = state.animation.current && state.animation.current.start;
      state.animation.current = {
        start: new Date().getTime(),
        duration: state.animation.duration,
        plan: plan
      };
      if (!alreadyRunning) go(state);
    } else {
      // don't animate, just render right away
      state.dom.redraw();
    }
  } else {
    // animations are now disabled
    state.dom.redraw();
  }
  return result;
}

function isObjectEmpty(o: any): boolean {
  for (let _ in o) return false;
  return true;
}
// https://gist.github.com/gre/1650294
function easing(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}