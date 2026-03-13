import { Response } from 'express';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

interface SSEClient {
  res: Response;
  types: ('app' | 'error' | 'security')[];
  lastPosition: Map<string, number>; // Track file position for each log type
}

class LogStreamService extends EventEmitter {
  private sseClients: Set<SSEClient> = new Set();
  private wsConnections: Set<any> = new Set();
  private logDir: string;
  private fileWatchers: Map<string, any> = new Map();

  constructor(logDir?: string) {
    super();
    this.logDir = logDir || path.join(__dirname, '..', '..', 'logs');
    console.log('[LogStreamService] logDir:', this.logDir);
  }

  /**
   * Register an SSE client for real-time log streaming
   */
  registerSSEClient(res: Response, types: ('app' | 'error' | 'security')[] = ['app', 'error', 'security']) {
    console.log('[SSE-Service] Register called, types:', types);
    
    const client: SSEClient = { 
      res, 
      types,
      lastPosition: new Map(types.map(t => [t, 0]))
    };
    this.sseClients.add(client);

    // Ensure no compression or buffering interferes
    res.setHeader('Content-Encoding', 'none');
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering even if behind proxy

    // Send initial connection message
    console.log('[SSE-Service] Sending initial connected message');
    try {
      const msg = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      console.log('[SSE-Service] Writing:', msg.substring(0, 100) + '...');
      res.write(msg, (err) => {
        if (err) {
          console.error('[SSE-Service] Write error on connected message:', err);
        } else {
          console.log('[SSE-Service] ✅ Connected message written successfully');
        }
      });
    } catch (error) {
      console.error('[SSE-Service] ❌ Error writing connected message:', error);
    }

    // Set up file watchers for this client
    this.setupFileWatchers(client);

    // Handle client disconnect
    res.on('close', () => {
      console.log('[SSE-Service] Connection closed by client');
      this.sseClients.delete(client);
    });

    res.on('error', (error) => {
      console.error('[SSE-Service] Connection error:', error);
      this.sseClients.delete(client);
    });

    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      try {
        console.log('[SSE-Service] Sending keep-alive ping');
        res.write(`: keep-alive\n\n`, (err) => {
          if (err) {
            console.error('[SSE-Service] Keep-alive error:', err);
            clearInterval(keepAliveInterval);
          }
        });
      } catch (error) {
        console.error('[SSE-Service] Keep-alive exception:', error);
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    res.on('close', () => {
      clearInterval(keepAliveInterval);
    });

    return client;
  }

  /**
   * Set up file watchers to stream new log entries
   */
  private setupFileWatchers(client: SSEClient) {
    const today = new Date().toISOString().split('T')[0];
    
    client.types.forEach(type => {
      const filename = `${type}-${today}.log`;
      const filePath = path.join(this.logDir, filename);

      // Try to read new lines from the file
      const checkNewLines = () => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(Boolean);
          
          let lastPos = client.lastPosition.get(type) || 0;
          
          // Send any new lines since last read
          for (let i = lastPos; i < lines.length; i++) {
            try {
              const logEntry = JSON.parse(lines[i]);
              client.res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
            } catch (e) {
              // Skip non-JSON lines
            }
          }
          
          client.lastPosition.set(type, lines.length);
        } catch (error) {
          // File might not exist yet, silently continue
        }
      };

      // Check immediately and then periodically
      checkNewLines();
      
      // Poll for new lines every 500ms
      const pollInterval = setInterval(() => {
        try {
          checkNewLines();
        } catch (error) {
          clearInterval(pollInterval);
        }
      }, 500);

      client.res.on('close', () => {
        clearInterval(pollInterval);
      });
    });
  }

  /**
   * Register a WebSocket connection
   */
  registerWSConnection(ws: any, types: ('app' | 'error' | 'security')[] = ['app', 'error', 'security']) {
    const connection = { ws, types, id: Math.random().toString(36) };
    this.wsConnections.add(connection);

    // Send initial connection message
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

    // Handle WebSocket messages
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleWSMessage(connection, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      this.wsConnections.delete(connection);
    });

    ws.on('error', () => {
      this.wsConnections.delete(connection);
    });

    return connection;
  }

  /**
   * Handle messages from WebSocket clients
   */
  private handleWSMessage(connection: any, data: any) {
    const { action, type, count } = data;

    switch (action) {
      case 'subscribe':
        if (Array.isArray(type)) {
          connection.types = type.filter((t: string) => ['app', 'error', 'security'].includes(t));
        }
        break;

      case 'getHistorical':
        if (type && ['app', 'error', 'security'].includes(type)) {
          const today = new Date().toISOString().split('T')[0];
          const filename = `${type}-${today}.log`;
          const filePath = path.join(this.logDir, filename);
          
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(Boolean);
            const entries = lines.slice(-(count || 100)).map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return null;
              }
            }).filter(Boolean);
            
            connection.ws.send(JSON.stringify({ type: 'historical', entries }));
          } catch (error) {
            connection.ws.send(JSON.stringify({ type: 'error', message: 'Failed to read log file' }));
          }
        }
        break;

      case 'ping':
        connection.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  }

  /**
   * Cleanup (e.g., on server shutdown)
   */
  cleanup() {
    this.sseClients.forEach(client => {
      try {
        client.res.end();
      } catch (error) {
        // Already closed
      }
    });
    this.sseClients.clear();

    this.wsConnections.forEach(connection => {
      try {
        connection.ws.close();
      } catch (error) {
        // Already closed
      }
    });
    this.wsConnections.clear();

    // Close file watchers
    this.fileWatchers.forEach((watcher: any) => {
      try {
        watcher.close();
      } catch (error) {
        // Already closed
      }
    });
    this.fileWatchers.clear();
  }
}

// Export singleton instance
export const logStreamService = new LogStreamService();
