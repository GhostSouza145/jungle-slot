import { useEffect, useRef, useState } from "react";
import { SlotMachine } from "./assets/game/SlotMachine";
import type {
  GameWebSocketEvent,
  SpinResponse,
  SpinResult,
} from "./assets/gamelogic";
import "./App.css";

function App() {
  const gameContainer = useRef<HTMLDivElement>(null);
  const slotMachine = useRef<SlotMachine | null>(null);
  const websocket = useRef<WebSocket | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [win, setWin] = useState(0);
  const [websocketConnected, setWebsocketConnected] = useState(false);

  // PIXI
  useEffect(() => {
    let cancelled = false;
    let machine: SlotMachine | null = null;
    let initialized = false;

    const initializeGame = async () => {
      if (!gameContainer.current) return;

      const currentMachine = new SlotMachine();
      machine = currentMachine;
      slotMachine.current = currentMachine;

      try {
        await currentMachine.initialize(gameContainer.current);
        initialized = true;

        // Em desenvolvimento, o React StrictMode pode desmontar
        // a primeira instância antes dela ser usada.
        if (cancelled) {
          currentMachine.destroy();

          if (slotMachine.current === currentMachine) {
            slotMachine.current = null;
          }
        }
      } catch (error) {
        console.error("Erro ao inicializar PixiJS:", error);

        if (slotMachine.current === currentMachine) {
          slotMachine.current = null;
        }
      }
    };

    void initializeGame();

    return () => {
      cancelled = true;

      // IMPORTANTE:
      // se o initialize ainda estiver aguardando app.init(),
      // não chamamos destroy aqui. O próprio initialize fará
      // a limpeza quando terminar.
      if (initialized && machine) {
        try {
          machine.destroy();
        } catch (error) {
          console.warn("Erro ao destruir PixiJS:", error);
        }

        if (slotMachine.current === machine) {
          slotMachine.current = null;
        }
      }
    };
  }, []);

  // WEBSOCKET
  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    // Pequeno atraso para evitar a conexão "fantasma" do StrictMode
    // durante a montagem/desmontagem inicial em desenvolvimento.
    const timer = window.setTimeout(() => {
      if (cancelled) return;

      try {
        socket = new WebSocket("ws://localhost:3001/ws");
        websocket.current = socket;

        socket.onopen = () => {
          if (cancelled) return;

          console.log("WebSocket conectado.");
          setWebsocketConnected(true);
        };

        socket.onmessage = (event) => {
          if (cancelled) return;

          try {
            const data = JSON.parse(event.data) as GameWebSocketEvent;

            if (data.type === "connected") {
              setWebsocketConnected(true);
              return;
            }

            if (data.type === "round_update") {
              console.log("Nova rodada:", data.round);
              return;
            }

            if (data.type === "spin_completed") {
              console.log("Giro recebido pelo WebSocket:", data);
            }
          } catch (error) {
            console.error("Erro ao processar mensagem do WebSocket:", error);
          }
        };

        socket.onerror = () => {
          if (cancelled) return;

          console.warn(
            "WebSocket não conectado. O jogo continuará funcionando pela API."
          );
          setWebsocketConnected(false);
        };

        socket.onclose = () => {
          if (cancelled) return;

          console.warn("WebSocket desconectado.");
          setWebsocketConnected(false);
        };
      } catch (error) {
        console.warn("Não foi possível conectar ao WebSocket:", error);
        setWebsocketConnected(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
      }

      websocket.current = null;
      setWebsocketConnected(false);
    };
  }, []);

  // SPIN
  const handleSpin = async () => {
    if (spinning) return;

    if (bet <= 0) {
      setMessage("Digite uma aposta válida.");
      return;
    }

    if (bet > balance) {
      setMessage("Saldo insuficiente.");
      return;
    }

    if (!slotMachine.current) {
      setMessage("O jogo ainda está carregando.");
      return;
    }

    setSpinning(true);
    setMessage("Girando...");
    setResult(null);
    setWin(0);

    setBalance((currentBalance) => currentBalance - bet);

    try {
      const response = await fetch("http://localhost:3001/api/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bet }),
      });

      if (!response.ok) {
        throw new Error("Erro na API.");
      }

      const data = (await response.json()) as SpinResponse;

      if (!slotMachine.current) {
        throw new Error("Máquina do jogo não está disponível.");
      }

      await slotMachine.current.spin(data.result);

      setResult(data.result);
      setWin(data.win);

      if (data.win > 0) {
        setBalance((currentBalance) => currentBalance + data.win);
        setMessage(`Você ganhou R$ ${data.win.toFixed(2)}!`);
        void slotMachine.current?.celebrateWin();
      } else {
        setMessage("Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao girar:", error);

      setBalance((currentBalance) => currentBalance + bet);
      setMessage("Erro ao conectar ao servidor.");
    } finally {
      setSpinning(false);
    }
  };

  return (
    <main className="game">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">J</span>

          <div>
            <h1>Jungle Slot</h1>
            <span>Demo Game</span>
          </div>
        </div>

        <div className="balance-box">
          <span>BALANCE</span>
          <strong>R$ {balance.toFixed(2)}</strong>
        </div>
      </header>

      <section className="game-section">
        <div className="game-title">
          <div>
            <span>CLASSIC REELS</span>
            <h2>Lucky Jungle</h2>
          </div>

          <div
            className={
              websocketConnected ? "connection connected" : "connection"
            }
          >
            <span className="connection-dot" />
            {websocketConnected ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        <div ref={gameContainer} className="game-canvas" />

        <div className={win > 0 ? "result-message win" : "result-message"}>
          {message || "Boa sorte!"}
        </div>
      </section>

      <section className="controls">
        <div className="bet-control">
          <span>BET</span>

          <div className="bet-input-wrapper">
            <button
              type="button"
              disabled={spinning || bet <= 1}
              onClick={() =>
                setBet((current) => Math.max(1, current - 1))
              }
            >
              −
            </button>

            <input
              type="number"
              min="1"
              value={bet}
              disabled={spinning}
              onChange={(event) =>
                setBet(Math.max(1, Number(event.target.value) || 1))
              }
            />

            <button
              type="button"
              disabled={spinning}
              onClick={() => setBet((current) => current + 1)}
            >
              +
            </button>
          </div>
        </div>

        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={spinning}
        >
          <span>{spinning ? "SPINNING" : "SPIN"}</span>
          <small>
            {spinning ? "Please wait" : `Bet R$ ${bet.toFixed(2)}`}
          </small>
        </button>
      </section>

      {result && (
        <section className="result-panel">
          <span>LAST RESULT</span>

          <div className="result-symbols">
            {result.map((symbol, index) => (
              <div key={index} className="result-symbol">
                {symbol}
              </div>
            ))}
          </div>

          {win > 0 && (
            <div className="win-value">+ R$ {win.toFixed(2)}</div>
          )}
        </section>
      )}

      <footer>Jungle Slot • Frontend Game Prototype</footer>
    </main>
  );
}

export default App;
