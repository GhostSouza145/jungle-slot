# Jungle Slot

Protótipo de caça-níquel (slot machine) feito com **React + TypeScript + PixiJS** no frontend e um servidor **Express + WebSocket** no backend.

## Stack

- **Frontend:** React 19, TypeScript, Vite, PixiJS (renderização do jogo em canvas)
- **Backend:** Node.js, Express (API REST) e `ws` (WebSocket para eventos em tempo real)

## Como rodar

Instale as dependências:

```bash
npm install
```

Em um terminal, suba o servidor (API + WebSocket na porta 3001):

```bash
npm run server
```

Em outro terminal, suba o frontend (Vite na porta 5173):

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

## Estrutura

```
src/
  App.tsx                 # UI React (saldo, aposta, botão de girar)
  assets/
    gamelogic.ts           # Tipos compartilhados (símbolos, resultado do giro, eventos)
    game/
      SlotMachine.ts        # Máquina do jogo em PixiJS (reels, animações, gabinete)
      symbols/              # Sprites SVG dos símbolos (cereja, limão, estrela)
server/
  server.js                 # API REST (/api/spin) + WebSocket (/ws)
```

## Scripts

- `npm run dev` — inicia o frontend em modo desenvolvimento
- `npm run server` — inicia o backend (API + WebSocket)
- `npm run build` — build de produção do frontend
- `npm run lint` — roda o oxlint
