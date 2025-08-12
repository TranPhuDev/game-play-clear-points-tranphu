import { useEffect, useRef, useState } from "react";
import "./styles/App.css"

function App() {
  const [points, setPoints] = useState<number | string>(0);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const [circles, setCircles] = useState<{ id: number; x: number; y: number }[]>([]);
  const [nextPoint, setNextPoint] = useState<number>(1);
  const [clickedBubbles, setClickedBubbles] = useState<Set<number>>(new Set());
  const [countdownTimers, setCountdownTimers] = useState<Map<number, number>>(new Map());

  const countdownIntervalsRef = useRef<Map<number, number>>(new Map());
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    if (gameStarted) {
      timer = window.setInterval(() => {
        setTime((prev) => parseFloat((prev + 0.1).toFixed(1)));
      }, 100);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [gameStarted]);

  useEffect(() => {
    if (gameOver) stopAllCountdowns();
  }, [gameOver]);

  const getCircleSize = () => {
    if (window.innerWidth <= 360) return 28;
    if (window.innerWidth <= 480) return 32;
    if (window.innerWidth <= 768) return 36;
    return 40;
  };

  const generateRandomCircles = (n: number, width: number, height: number) => {
    const out: { id: number; x: number; y: number }[] = [];
    const pad = 4;
    const circleSize = getCircleSize();
    const maxX = Math.max(0, width - circleSize - pad);
    const maxY = Math.max(0, height - circleSize - pad);
    const dist2Min = (circleSize + 6) ** 2;

    const isFarEnough = (x: number, y: number) => {
      const cx = x + circleSize / 2;
      const cy = y + circleSize / 2;
      return out.every((o) => {
        const ocx = o.x + circleSize / 2;
        const ocy = o.y + circleSize / 2;
        const dx = cx - ocx;
        const dy = cy - ocy;
        return dx * dx + dy * dy >= dist2Min;
      });
    };

    for (let i = 1; i <= n; i++) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const x = Math.floor(pad + Math.random() * (maxX - pad + 1));
        const y = Math.floor(pad + Math.random() * (maxY - pad + 1));
        if (isFarEnough(x, y)) {
          out.push({ id: i, x, y });
          placed = true;
        }
      }
      if (!placed) {
        const x = Math.floor(pad + Math.random() * (maxX - pad + 1));
        const y = Math.floor(pad + Math.random() * (maxY - pad + 1));
        out.push({ id: i, x, y });
      }
    }
    return out;
  };

  const stopAllCountdowns = () => {
    countdownIntervalsRef.current.forEach((id) => window.clearInterval(id));
    countdownIntervalsRef.current.clear();
  };

  const resetCommonState = () => {
    setTime(0);
    setGameCompleted(false);
    setGameOver(false);
    setAutoPlay(false);
    setNextPoint(1);
    setClickedBubbles(new Set());
    setCountdownTimers(new Map());
    stopAllCountdowns();
  };

  const handlePlay = () => {
    resetCommonState();
    const board = boardRef.current;
    const w = board?.clientWidth ?? 360;
    const h = board?.clientHeight ?? 280;
    setCircles(
      generateRandomCircles(Math.max(0, Number(points) || 0), w, h)
    );
    setGameStarted(true);
  };

  const handleRestart = () => {
    if (gameCompleted || gameOver) {
      resetCommonState();
      setCircles([]);
      setGameStarted(false);
    } else {
      resetCommonState();
      const board = boardRef.current;
      const w = board?.clientWidth ?? 360;
      const h = board?.clientHeight ?? 280;
      setCircles(
        generateRandomCircles(Math.max(0, Number(points) || 0), w, h)
      );
      setGameStarted(true);
    }
  };

  const handleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  const handleCircleClick = (clickedId: number) => {
    if (!gameStarted || gameCompleted || gameOver) return;

    if (clickedId !== nextPoint) {
      setGameOver(true);
      setGameStarted(false);
      stopAllCountdowns();
      return;
    }

    setClickedBubbles((prev) => new Set(prev).add(clickedId));
    setCountdownTimers((prev) => new Map(prev).set(clickedId, 3));
    setNextPoint((prev) => prev + 1);

    const countdownInterval = window.setInterval(() => {
      if (gameOver) {
        window.clearInterval(countdownInterval);
        countdownIntervalsRef.current.delete(clickedId);
        return;
      }

      setCountdownTimers((prev) => {
        const map = new Map(prev);
        const current = map.get(clickedId) ?? 0;

        if (current <= 0.1) {
          setCircles((prevCircles) => prevCircles.filter((c) => c.id !== clickedId));
          setClickedBubbles((prev) => {
            const s = new Set(prev);
            s.delete(clickedId);
            return s;
          });
          map.delete(clickedId);
          window.clearInterval(countdownInterval);
          countdownIntervalsRef.current.delete(clickedId);
        } else {
          map.set(clickedId, parseFloat((current - 0.1).toFixed(1)));
        }
        return map;
      });
    }, 100);

    countdownIntervalsRef.current.set(clickedId, countdownInterval);
  };

  useEffect(() => {
    if (circles.length === 0 && gameStarted && !gameCompleted) {
      setGameCompleted(true);
      setGameStarted(false);
      setNextPoint(1);
      stopAllCountdowns();
    }
  }, [circles.length, gameStarted, gameCompleted]);

  useEffect(() => {
    if (autoPlay && gameStarted && !gameCompleted && !gameOver) {
      const currentNextPoint = nextPoint;
      const targetCircle = circles.find(c => c.id === currentNextPoint);

      if (targetCircle) {
        const autoClickTimer = setTimeout(() => {
          handleCircleClick(currentNextPoint);
        }, 900);

        return () => clearTimeout(autoClickTimer);
      }
    }
  }, [autoPlay, gameStarted, gameCompleted, gameOver, nextPoint, circles]);

  return (
    <div className="wrap">
      <div className="card">
        <h2 className={gameCompleted ? "game-completed" : gameOver ? "game-over" : ""}>
          {gameOver ? "GAME OVER" : gameCompleted ? "ALL CLEARED" : "LET'S PLAY"}
        </h2>

        <div className="panel">
          <label className="row">
            <span>Points:</span>
            <input
              className="points"
              type="number"
              min={0}
              step={1}
              value={points}
              onChange={(e) => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <div className="row">
            <span>Time:</span>
            <span className="time">{time.toFixed(1)}s</span>
          </div>
          <div className="row">
            {!gameStarted && !gameCompleted && !gameOver ? (
              <button className="btn" type="button" onClick={handlePlay}>Play</button>
            ) : gameCompleted || gameOver ? (
              <button className="btn" type="button" onClick={handleRestart}>Restart</button>
            ) : (
              <>
                <button className="btn" type="button" onClick={handleRestart}>Restart</button>
                <button className="btn" type="button" onClick={handleAutoPlay}>
                  Auto Play {autoPlay ? "OFF" : "ON"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="board-container">
          <div className={`board ${gameOver ? "paused" : ""}`} ref={boardRef}>
            {circles.map((c) => (
              <div
                key={c.id}
                className={`bubble ${clickedBubbles.has(c.id) ? "clicked" : ""}`}
                style={{ left: c.x, top: c.y }}
                onClick={() => handleCircleClick(c.id)}
              >
                <div className="bubble-number">{c.id}</div>
                {clickedBubbles.has(c.id) && countdownTimers.has(c.id) && (
                  <div className="bubble-countdown">{countdownTimers.get(c.id)?.toFixed(1)}s</div>
                )}
              </div>
            ))}


          </div>
          {gameStarted && !gameCompleted && !gameOver && nextPoint <= Number(points) && (
              <div className="next">
                <span>Next: {nextPoint}</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;
