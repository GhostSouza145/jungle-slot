import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const app = express();

const PORT = 3001;

// ==========================================
// SERVIDOR HTTP
// ==========================================

const server = createServer(app);

// ==========================================
// WEBSOCKET
// ==========================================

const wss = new WebSocketServer({
  server,
  path: "/ws",
});

// ==========================================
// MIDDLEWARES
// ==========================================

app.use(cors());

app.use(express.json());

// ==========================================
// CONFIGURAÇÃO DO JOGO
// ==========================================

const SYMBOLS = [
  "🍒",
  "🍋",
  "⭐",
];

const PAYOUTS = {
  "🍒": 3,
  "🍋": 5,
  "⭐": 10,
};

// ==========================================
// FUNÇÃO PARA ENVIAR WEBSOCKET
// ==========================================

function broadcast(data) {
  const message = JSON.stringify(data);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// ==========================================
// CONEXÃO WEBSOCKET
// ==========================================

wss.on("connection", (socket) => {
  console.log(
    "🔌 Novo cliente conectado via WebSocket."
  );

  // Envia uma mensagem inicial
  socket.send(
    JSON.stringify({
      type: "connected",
      message:
        "WebSocket conectado ao Jungle Slot!",
      timestamp: Date.now(),
    })
  );

  socket.on("close", () => {
    console.log(
      "🔌 Cliente desconectou do WebSocket."
    );
  });

  socket.on("error", (error) => {
    console.error(
      "Erro no WebSocket:",
      error
    );
  });
});

// ==========================================
// GERAR RESULTADO
// ==========================================

function generateSpinResult() {
  return [
    SYMBOLS[
      Math.floor(
        Math.random() * SYMBOLS.length
      )
    ],

    SYMBOLS[
      Math.floor(
        Math.random() * SYMBOLS.length
      )
    ],

    SYMBOLS[
      Math.floor(
        Math.random() * SYMBOLS.length
      )
    ],
  ];
}

// ==========================================
// VERIFICAR VITÓRIA
// ==========================================

function checkWin(result) {
  return (
    result[0] === result[1] &&
    result[1] === result[2]
  );
}

// ==========================================
// CALCULAR PRÊMIO
// ==========================================

function calculateWin(result, bet) {
  if (!checkWin(result)) {
    return 0;
  }

  const symbol = result[0];

  return bet * PAYOUTS[symbol];
}

// ==========================================
// REST - ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message:
      "Jungle Slot API funcionando!",
  });
});

// ==========================================
// REST - GIRO DO SLOT
// ==========================================

app.post("/api/spin", (req, res) => {
  try {
    const bet = Number(req.body.bet);

    // --------------------------------------
    // VALIDAR APOSTA
    // --------------------------------------

    if (!Number.isFinite(bet)) {
      return res.status(400).json({
        error: "Aposta inválida.",
      });
    }

    if (bet <= 0) {
      return res.status(400).json({
        error:
          "A aposta precisa ser maior que zero.",
      });
    }

    // --------------------------------------
    // GERAR RESULTADO
    // --------------------------------------

    const result =
      generateSpinResult();

    // --------------------------------------
    // CALCULAR PRÊMIO
    // --------------------------------------

    const win =
      calculateWin(
        result,
        bet
      );

    // --------------------------------------
    // AVISAR CLIENTES VIA WEBSOCKET
    // --------------------------------------

    broadcast({
      type: "spin_completed",

      result,

      bet,

      win,

      timestamp: Date.now(),
    });

    // --------------------------------------
    // RESPONDER REST
    // --------------------------------------

    return res.json({
      result,

      bet,

      win,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error:
        "Erro interno do servidor.",
    });
  }
});

// ==========================================
// SIMULAÇÃO DE EVENTOS EM TEMPO REAL
// ==========================================

let roundNumber = 1;

function sendRoundEvent() {
  broadcast({
    type: "round_update",

    round: roundNumber,

    message:
      `Rodada ${roundNumber} disponível`,

    timestamp: Date.now(),
  });

  roundNumber++;
}

// Envia um evento a cada 5 segundos
setInterval(() => {
  sendRoundEvent();
}, 5000);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 Jungle Slot rodando em http://localhost:${PORT}`
    );

    console.log(
      `🔌 WebSocket rodando em ws://localhost:${PORT}/ws`
    );
  }
);