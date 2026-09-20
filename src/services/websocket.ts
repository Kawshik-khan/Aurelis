type WebSocketEventHandler = (payload: any) => void;

export class AurelisSocketClient {
  private static instance: AurelisSocketClient | null = null;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private currentUserId: string | null = null;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): AurelisSocketClient {
    if (!this.instance) {
      this.instance = new AurelisSocketClient();
    }
    return this.instance;
  }

  public connect(userId?: string) {
    if (userId) {
      this.currentUserId = userId;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.currentUserId && this.ws.readyState === WebSocket.OPEN) {
        this.identify(this.currentUserId);
      }
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws`;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.currentUserId) {
          this.identify(this.currentUserId);
        }

        // Heartbeat
        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          const payload = data.payload;

          const handlers = this.listeners.get(type);
          if (handlers) {
            handlers.forEach((handler) => handler(payload));
          }

          const allHandlers = this.listeners.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => handler(data));
          }
        } catch (e) {
          console.warn('Socket message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        clearInterval(this.pingInterval);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.ws?.close();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private identify(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'IDENTIFY', userId }));
    }
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.currentUserId) {
        this.connect(this.currentUserId);
      }
    }, 4000);
  }

  public on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(handler);
      }
    };
  }

  public disconnect() {
    clearTimeout(this.reconnectTimeout);
    clearInterval(this.pingInterval);
    this.currentUserId = null;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const DbsSocketClient = AurelisSocketClient;
