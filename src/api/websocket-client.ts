import { ref } from "vue";

export type WsEventHandler = (data: unknown) => void;

interface WsServerMessage {
  event?: string;
  data?: unknown;
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<WsEventHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  public readonly isConnected = ref(false);

  connect(): void {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "localhost";
    const wsUrl = `${protocol}//${host}:3001`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected.value = true;
        console.log("[WebSocket] Connecté au flux temps réel de l'API");
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WsServerMessage;
          if (payload?.event) {
            this.emit(payload.event, payload.data);
          }
        } catch (_err: unknown) {
          // Ignoré
        }
      };

      this.socket.onclose = () => {
        this.isConnected.value = false;
        this.socket = null;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected.value = false;
        this.socket?.close();
      };
    } catch (_err: unknown) {
      this.isConnected.value = false;
      this.scheduleReconnect();
    }
  }

  on(event: string, handler: WsEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.handlers.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err: unknown) {
          console.error(`[WebSocket] Erreur handler ${event}:`, err);
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }
}

export const wsClient = new WebSocketClient();
