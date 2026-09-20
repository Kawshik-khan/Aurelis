import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface SocketEvent {
  type: string;
  payload?: any;
  timestamp?: string;
}

export class SocketService {
  private static wss: WebSocketServer;
  private static clients: Set<WebSocket> = new Set();
  private static userSockets: Map<string, Set<WebSocket>> = new Map();
  private static socketUserMap: Map<WebSocket, string> = new Map();

  public static initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Send initial welcome & connection ack
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          message: 'Connected to DBS Bank Real-Time Settlement Engine',
          timestamp: new Date().toISOString(),
        })
      );

      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'IDENTIFY' && parsed.userId) {
            const userId = String(parsed.userId);
            // Associate this ws with the user
            this.socketUserMap.set(ws, userId);
            if (!this.userSockets.has(userId)) {
              this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(ws);

            ws.send(
              JSON.stringify({
                type: 'IDENTIFIED',
                userId,
                timestamp: new Date().toISOString(),
              })
            );
          } else if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch {
          // Ignore malformed client messages
        }
      });

      const cleanup = () => {
        this.clients.delete(ws);
        const userId = this.socketUserMap.get(ws);
        if (userId) {
          this.socketUserMap.delete(ws);
          const set = this.userSockets.get(userId);
          if (set) {
            set.delete(ws);
            if (set.size === 0) {
              this.userSockets.delete(userId);
            }
          }
        }
      };

      ws.on('close', cleanup);
      ws.on('error', cleanup);
    });
  }

  public static broadcastAll(event: SocketEvent) {
    const message = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  public static broadcast(event: SocketEvent) {
    this.broadcastAll(event);
  }

  public static broadcastToUser(userId: string, event: SocketEvent) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const message = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

