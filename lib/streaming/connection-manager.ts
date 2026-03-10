// Connection manager for handling real-time streaming lifecycle
import { StreamEvent, StreamConnection } from './types';

export class ConnectionManager {
  private connections: Map<string, StreamConnection> = new Map();
  private eventCallbacks: Map<string, ((event: StreamEvent) => void)[]> = new Map();
  private errorCallbacks: Map<string, ((error: Error) => void)[]> = new Map();
  private connectCallbacks: Map<string, (() => void)[]> = new Map();
  private disconnectCallbacks: Map<string, (() => void)[]> = new Map();

  registerConnection(connectionId: string, userId: string, brokerAccountId: string): StreamConnection {
    const connection: StreamConnection = {
      id: connectionId,
      userId,
      brokerAccountId,
      connectionType: 'websocket',
      status: 'connecting',
      reconnectAttempts: 0,
    };
    this.connections.set(connectionId, connection);
    return connection;
  }

  getConnection(connectionId: string): StreamConnection | undefined {
    return this.connections.get(connectionId);
  }

  updateStatus(connectionId: string, status: StreamConnection['status'], error?: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = status;
      connection.lastHeartbeat = new Date();
      if (error) connection.error = error;
      if (status === 'connected') {
        connection.connectionTime = new Date();
        connection.reconnectAttempts = 0;
        this.triggerConnectCallbacks(connectionId);
      }
      if (status === 'disconnected') {
        this.triggerDisconnectCallbacks(connectionId);
      }
    }
  }

  incrementReconnectAttempts(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.reconnectAttempts++;
    }
  }

  removeConnection(connectionId: string) {
    this.connections.delete(connectionId);
    this.eventCallbacks.delete(connectionId);
    this.errorCallbacks.delete(connectionId);
    this.connectCallbacks.delete(connectionId);
    this.disconnectCallbacks.delete(connectionId);
  }

  // Event handling
  onData(connectionId: string, callback: (event: StreamEvent) => void) {
    if (!this.eventCallbacks.has(connectionId)) {
      this.eventCallbacks.set(connectionId, []);
    }
    this.eventCallbacks.get(connectionId)!.push(callback);
  }

  onError(connectionId: string, callback: (error: Error) => void) {
    if (!this.errorCallbacks.has(connectionId)) {
      this.errorCallbacks.set(connectionId, []);
    }
    this.errorCallbacks.get(connectionId)!.push(callback);
  }

  onConnect(connectionId: string, callback: () => void) {
    if (!this.connectCallbacks.has(connectionId)) {
      this.connectCallbacks.set(connectionId, []);
    }
    this.connectCallbacks.get(connectionId)!.push(callback);
  }

  onDisconnect(connectionId: string, callback: () => void) {
    if (!this.disconnectCallbacks.has(connectionId)) {
      this.disconnectCallbacks.set(connectionId, []);
    }
    this.disconnectCallbacks.get(connectionId)!.push(callback);
  }

  emitData(connectionId: string, event: StreamEvent) {
    const callbacks = this.eventCallbacks.get(connectionId) || [];
    callbacks.forEach(cb => cb(event));
  }

  emitError(connectionId: string, error: Error) {
    const callbacks = this.errorCallbacks.get(connectionId) || [];
    callbacks.forEach(cb => cb(error));
    this.updateStatus(connectionId, 'error', error.message);
  }

  private triggerConnectCallbacks(connectionId: string) {
    const callbacks = this.connectCallbacks.get(connectionId) || [];
    callbacks.forEach(cb => cb());
  }

  private triggerDisconnectCallbacks(connectionId: string) {
    const callbacks = this.disconnectCallbacks.get(connectionId) || [];
    callbacks.forEach(cb => cb());
  }

  getConnectionsByBroker(brokerAccountId: string): StreamConnection[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.brokerAccountId === brokerAccountId
    );
  }

  getAllConnections(): StreamConnection[] {
    return Array.from(this.connections.values());
  }
}

// Global connection manager instance
export const connectionManager = new ConnectionManager();
