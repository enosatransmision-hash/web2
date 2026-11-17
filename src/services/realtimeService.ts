import { Usuario } from '../types';

export interface ActiveUserPresence {
  id: string;
  user: Usuario;
  activeModule: string;
  activeLine: string;
  connectedAt: string;
}

export interface LiveNotification {
  id: string;
  title: string;
  message: string;
  user: string;
  timestamp: string;
}

export interface PendingMutation {
  mutationId: string;
  entity: string;
  action: string;
  data: any;
  shiftSubsequent?: boolean;
  user: Usuario | null;
  createdAt: number;
}

const PENDING_MUTATIONS_KEY = 'st_pending_mutations_v1';

type StateUpdateListener = (entity: string, action: string, data: any, fullState?: any) => void;
type PresenceListener = (users: ActiveUserPresence[]) => void;
type NotificationListener = (notification: LiveNotification) => void;
type ConnectionListener = (connected: boolean) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2;
  private currentUser: Usuario | null = null;
  private currentModule = 'dashboard';
  private currentLine = 'TODAS';
  private clientId: string;

  private stateListeners: Set<StateUpdateListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();

  private activeUsers: ActiveUserPresence[] = [];
  private heartbeatInterval: any = null;
  private pollingInterval: any = null;
  private lastKnownVersion = 0;
  private lastSeenAuditId = '';
  private pendingMutations: PendingMutation[] = [];
  private isFlushing = false;

  constructor() {
    // Generate or retrieve persistent tab client ID
    try {
      let storedId = sessionStorage.getItem('st_realtime_client_id');
      if (!storedId) {
        storedId = 'CLI-' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('st_realtime_client_id', storedId);
      }
      this.clientId = storedId;
    } catch {
      this.clientId = 'CLI-' + Math.random().toString(36).substring(2, 9);
    }

    this.pendingMutations = this.loadPendingMutations();
  }

  private loadPendingMutations(): PendingMutation[] {
    try {
      const raw = localStorage.getItem(PENDING_MUTATIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private savePendingMutations() {
    try {
      if (this.pendingMutations.length === 0) {
        localStorage.removeItem(PENDING_MUTATIONS_KEY);
      } else {
        localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(this.pendingMutations.slice(-100)));
      }
    } catch {
      // Ignore quota errors on pending mutations mirror
    }
  }

  public getPendingMutations(): PendingMutation[] {
    return [...this.pendingMutations];
  }

  public connect(user?: Usuario) {
    if (user) {
      this.currentUser = user;
    }

    // Flush any queued local mutations right away
    void this.flushPendingMutations();

    // Always start resilient HTTP polling fallback immediately
    this.startPollingFallback();

    // In browser environments with WebSocket support, attempt WebSocket connection
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        if (this.ws.readyState === WebSocket.OPEN && this.currentUser) {
          this.identify(this.currentUser, this.currentModule, this.currentLine);
        }
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyConnection(true);

          if (this.currentUser) {
            this.identify(this.currentUser, this.currentModule, this.currentLine);
          }

          this.startHeartbeat();
          void this.flushPendingMutations();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleServerMessage(msg);
          } catch {
            // ignore non-json
          }
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(), 4000);
          }
        };

        this.ws.onerror = () => {
          this.ws = null;
        };
      } catch {
        // Handled gracefully
      }
    }
  }

  public disconnectUser() {
    this.currentUser = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
        this.ws.send(JSON.stringify({
          type: 'presence:heartbeat',
          activeModule: this.currentModule,
          activeLine: this.currentLine
        }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPollingFallback() {
    if (this.pollingInterval) return;

    // Initial immediate poll
    void this.pollServer();

    // Recurring poll every 3 seconds
    this.pollingInterval = setInterval(() => {
      void this.pollServer();
    }, 3000);
  }

  private async pollServer() {
    try {
      if (this.pendingMutations.length > 0) {
        await this.flushPendingMutations();
      }

      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          user: this.currentUser,
          activeModule: this.currentModule,
          activeLine: this.currentLine
        })
      });

      if (!res.ok) return;

      const data = await res.json();

      if (!this.isConnected) {
        this.isConnected = true;
        this.notifyConnection(true);
      }

      if (data.activeUsers && Array.isArray(data.activeUsers)) {
        this.activeUsers = data.activeUsers;
        this.notifyPresence(this.activeUsers);
      }

      // Check if server version changed (either incremented or restarted)
      if (data.version && data.version !== this.lastKnownVersion) {
        const isFirstRun = this.lastKnownVersion === 0;
        this.lastKnownVersion = data.version;

        if (!isFirstRun) {
          const stateRes = await fetch('/api/state');
          if (stateRes.ok) {
            const fullState = await stateRes.json();
            this.notifyState('all', 'init', fullState, fullState);

            if (data.lastAudit && data.lastAudit.id_auditoria !== this.lastSeenAuditId) {
              this.lastSeenAuditId = data.lastAudit.id_auditoria;
              const isDifferentUser = !this.currentUser || !data.lastAudit.usuario.includes(this.currentUser.nombres);
              if (isDifferentUser) {
                this.notifyNotification({
                  id: 'NOTIF-' + Date.now(),
                  title: `Actualización: ${data.lastAudit.modulo}`,
                  message: data.lastAudit.valores_nuevos || 'Datos actualizados en el sistema',
                  user: `${data.lastAudit.usuario} (${data.lastAudit.rol})`,
                  timestamp: data.lastAudit.hora || 'Ahora'
                });
              }
            }
          }
        }
      }
    } catch {
      // Offline or network transient error
    }
  }

  public identify(user: Usuario, activeModule?: string, activeLine?: string) {
    this.currentUser = user;
    if (activeModule) this.currentModule = activeModule;
    if (activeLine) this.currentLine = activeLine;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'auth:identify',
        user: {
          id_usuario: user.id_usuario,
          nombres: user.nombres,
          apellidos: user.apellidos,
          username: user.username,
          rol: user.rol,
          email: user.email
        },
        activeModule: this.currentModule,
        activeLine: this.currentLine
      }));
    }

    void this.pollServer();
  }

  public updatePresence(moduleName: string, lineCode: string) {
    this.currentModule = moduleName;
    this.currentLine = lineCode;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentUser) {
      this.ws.send(JSON.stringify({
        type: 'presence:heartbeat',
        activeModule: moduleName,
        activeLine: lineCode
      }));
    }

    void this.pollServer();
  }

  private handleServerMessage(msg: any) {
    switch (msg.type) {
      case 'init': {
        if (msg.activeUsers) {
          this.activeUsers = msg.activeUsers;
          this.notifyPresence(this.activeUsers);
        }
        if (msg.data && msg.data.version) {
          this.lastKnownVersion = msg.data.version;
        }
        this.notifyState('all', 'init', msg.data, msg.data);
        break;
      }

      case 'presence:update': {
        this.activeUsers = msg.activeUsers || [];
        this.notifyPresence(this.activeUsers);
        break;
      }

      case 'state:patch': {
        if (msg.version) {
          this.lastKnownVersion = msg.version;
        }
        this.notifyState(msg.entity, msg.action, msg.data);
        if (msg.notification) {
          this.notifyNotification({
            id: 'NOTIF-' + Date.now(),
            title: msg.notification.title,
            message: msg.notification.message,
            user: msg.notification.user,
            timestamp: msg.notification.timestamp
          });
        }
        break;
      }

      case 'sync:complete': {
        this.notifyNotification({
          id: 'NOTIF-SYNC-' + Date.now(),
          title: 'Sincronización de Google Drive Completada',
          message: `Datos actualizados a las ${msg.last_sync_time}`,
          user: 'Servidor Drive Sync',
          timestamp: msg.last_sync_time
        });
        break;
      }
    }
  }

  private async sendMutationRequest(entry: PendingMutation): Promise<boolean> {
    try {
      const serialized = JSON.stringify({
        type: 'mutate',
        mutationId: entry.mutationId,
        entity: entry.entity,
        action: entry.action,
        data: entry.data,
        shiftSubsequent: entry.shiftSubsequent,
        user: entry.user
      });

      const useKeepalive = serialized.length < 60000;
      const res = await fetch('/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
        ...(useKeepalive ? { keepalive: true } : {})
      });

      if (!res.ok) return false;
      const result = await res.json().catch(() => ({}));
      if (result && typeof result.version === 'number') {
        this.lastKnownVersion = result.version;
      }
      return true;
    } catch {
      return false;
    }
  }

  public async flushPendingMutations(): Promise<void> {
    if (this.isFlushing || this.pendingMutations.length === 0) return;
    this.isFlushing = true;
    try {
      while (this.pendingMutations.length > 0) {
        const next = this.pendingMutations[0];
        const ok = await this.sendMutationRequest(next);
        if (!ok) {
          break;
        }
        this.pendingMutations.shift();
        this.savePendingMutations();
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Persist mutation to durable local outbox first, then deliver via REST (/api/mutate)
   * with mutationId deduplication (server broadcasts via WebSocket to other clients).
   */
  public async mutate(entity: string, action: string, data: any, shiftSubsequent?: boolean, explicitUser?: Usuario): Promise<boolean> {
    const mutationId = 'MUT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const entry: PendingMutation = {
      mutationId,
      entity,
      action,
      data,
      shiftSubsequent,
      user: explicitUser || this.currentUser,
      createdAt: Date.now()
    };

    this.pendingMutations.push(entry);
    this.savePendingMutations();

    const ok = await this.sendMutationRequest(entry);
    if (ok) {
      this.pendingMutations = this.pendingMutations.filter(m => m.mutationId !== mutationId);
      this.savePendingMutations();
      setTimeout(() => void this.pollServer(), 150);
    }
    return ok;
  }

  // --- Listeners Subscriptions ---
  public onStateUpdate(fn: StateUpdateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  public onPresence(fn: PresenceListener): () => void {
    this.presenceListeners.add(fn);
    if (this.activeUsers.length > 0) fn(this.activeUsers);
    return () => this.presenceListeners.delete(fn);
  }

  public onNotification(fn: NotificationListener): () => void {
    this.notificationListeners.add(fn);
    return () => this.notificationListeners.delete(fn);
  }

  public onConnectionChange(fn: ConnectionListener): () => void {
    this.connectionListeners.add(fn);
    fn(this.isConnected);
    return () => this.connectionListeners.delete(fn);
  }

  private notifyState(entity: string, action: string, data: any, fullState?: any) {
    for (const fn of this.stateListeners) {
      fn(entity, action, data, fullState);
    }
  }

  private notifyPresence(users: ActiveUserPresence[]) {
    for (const fn of this.presenceListeners) {
      fn(users);
    }
  }

  private notifyNotification(notif: LiveNotification) {
    for (const fn of this.notificationListeners) {
      fn(notif);
    }
  }

  private notifyConnection(connected: boolean) {
    for (const fn of this.connectionListeners) {
      fn(connected);
    }
  }

  public getActiveUsers(): ActiveUserPresence[] {
    return this.activeUsers;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const realtimeService = new RealtimeService();
