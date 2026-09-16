import 'dotenv/config';
import http from 'http';
import { app } from './app';
import { SocketService } from './sockets/websocketServer';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize real-time WebSocket server
SocketService.initialize(server);

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[SERVER]  AURELIS Private Wealth API Core Server Running`);
  console.log(`[HTTP]    HTTP Gateway:     http://localhost:${PORT}/v1`);
  console.log(`[DOCS]    API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`[WS]      WebSocket Stream:  ws://localhost:${PORT}/ws`);
  console.log(`=======================================================`);
});
