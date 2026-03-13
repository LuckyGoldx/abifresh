'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { 
  Activity, FileText, Monitor, RefreshCw, Search, Server, Terminal, X, Pause, Play, Clock
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  category?: string;
  service?: string;
  ip?: string;
  auth?: boolean;
  userId?: string;
  username?: string;
  role?: string;
  path?: string;
  [key: string]: any;
}

interface FrontendLog {
  timestamp: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'network';
  message: string;
  details?: string;
  source?: string;
}

type LogTab = 'backend' | 'frontend';
type BackendLogType = 'app' | 'error' | 'security';
type StreamMode = 'sse' | 'polling';

export default function LogsPage() {
  const { token } = useAuthStore();
  
  // Debug: Log token and auth state on load
  useEffect(() => {
    console.log('[LOGS PAGE] Mounted. Token:', token ? 'Present' : 'MISSING', token?.substring(0, 30));
  }, []);
  
  const [activeTab, setActiveTab] = useState<LogTab>('backend');
  
  // Backend logs state
  const [backendLogType, setBackendLogType] = useState<BackendLogType>('app');
  const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [maxLines, setMaxLines] = useState(200);
  
  // Streaming state
  const [streamMode, setStreamMode] = useState<StreamMode>('sse');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Frontend logs state
  const [frontendLogs, setFrontendLogs] = useState<FrontendLog[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | FrontendLog | null>(null);

  // Fetch backend logs once
  const fetchBackendLogs = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/api/admin/logs?type=${backendLogType}&date=${logDate}&lines=${maxLines}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackendLogs(res.data.entries || []);
      setAvailableFiles(res.data.availableFiles || []);
      setTotalEntries(res.data.totalEntries || 0);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      setBackendLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, backendLogType, logDate, maxLines]);

  // Start SSE streaming
  const startSSEStream = useCallback(() => {
    if (!token) {
      const msg = 'No authentication token available';
      console.error('[SSE ERROR]', msg);
      setStreamError(msg);
      setConnectionStatus('error');
      setIsStreaming(false);
      return;
    }
    if (eventSourceRef.current) {
      console.log('[SSE] Already streaming, skipping');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${apiBase}/api/admin/logs/stream?type=${backendLogType}&token=${token}`;
    
    console.log('[SSE] Starting stream...');
    console.log('[SSE] API Base:', apiBase);
    console.log('[SSE] URL:', url);
    console.log('[SSE] Token:', token ? token.substring(0, 30) + '...' : 'MISSING');
    console.log('[SSE] Log type:', backendLogType);
    setConnectionStatus('connecting');
    setStreamError(null);
    
    let connectionTimeout: NodeJS.Timeout | null = null;
    let hasConnected = false;
    let messageReceived = false;
    
    try {
      console.log('[SSE] Creating EventSource...');
      const eventSource = new EventSource(url);
      console.log('[SSE] EventSource created, readyState:', eventSource.readyState);
      eventSourceRef.current = eventSource;

      // Add connection timeout - wait for first message
      connectionTimeout = setTimeout(() => {
        console.error('[SSE] ⏱️ TIMEOUT: No message within 8 seconds');
        console.error('[SSE] messageReceived flag:', messageReceived);
        console.error('[SSE] readyState:', eventSource.readyState);
        console.error('[SSE] Connection state: open=1, closing=2, closed=3');
        
        if (!messageReceived) {
          console.error('[SSE] ❌ No response from server - connection timeout');
          eventSource.close();
          eventSourceRef.current = null;
          
          const msg = 'SSE connection timeout. Server not responding. Switching to polling...';
          setStreamError(msg);
          setConnectionStatus('error');
          setIsStreaming(false);
          setStreamMode('polling');
        }
      }, 8000);

      eventSource.onopen = () => {
        hasConnected = true;
        console.log('[SSE] 🟢 onopen event fired');
        console.log('[SSE] readyState:', eventSource.readyState, '(0=connecting, 1=open, 2=closed)');
        console.log('[SSE] Waiting for onmessage handler...');
      };

      eventSource.onmessage = (event) => {
        console.log('[SSE] 📨 onmessage fired!');
        console.log('[SSE] Message event:', event);
        console.log('[SSE] Message data:', event.data);
        
        messageReceived = true;
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        console.log('[SSE] ✅ First message received, clearing timeout');
        setConnectionStatus('connected');
        setStreamError(null);
        setIsStreaming(true);

        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Parsed data:', data);
          
          if (data.type === 'connected') {
            console.log('[SSE] Received connected event');
            return;
          }

          console.log('[SSE] Received log entry:', data.message?.substring(0, 40));

          // Only add if not paused
          if (!streamPaused) {
            setBackendLogs(prev => {
              const updated = [data, ...prev];
              return updated.slice(0, 500);
            });
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      };

      eventSource.onerror = (error: any) => {
        console.error('[SSE] ✗ Connection ERROR');
        console.error('[SSE] Error object:', error);
        console.error('[SSE] ReadyState:', eventSource.readyState);
        console.error('[SSE] Status:', (error as any).status);
        console.error('[SSE] Error details:', {
          type: error?.type,
          message: error?.message,
          status: (error as any)?.status,
          readyState: eventSource.readyState,
        });
        
        if (connectionTimeout) clearTimeout(connectionTimeout);
        
        const msg = `SSE connection error (readyState: ${eventSource.readyState}). Trying polling...`;
        setStreamError(msg);
        setConnectionStatus('error');
        setIsStreaming(false);
        eventSource.close();
        eventSourceRef.current = null;
        setStreamMode('polling');
      };

      console.log('[SSE] EventSource created, waiting for connection...');
    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      
      const msg = `Failed to create SSE connection: ${error}`;
      setStreamError(msg);
      setConnectionStatus('error');
      setIsStreaming(false);
      setStreamMode('polling');
    }
  }, [token, backendLogType, streamPaused]);

  // Start polling stream
  const startPollingStream = useCallback(() => {
    if (pollIntervalRef.current) return;

    const poll = async () => {
      if (!streamPaused) {
        await fetchBackendLogs();
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    setIsStreaming(true);
    console.log('📊 Polling mode started (5s interval)');
  }, [fetchBackendLogs, streamPaused]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Initialize on tab change
  useEffect(() => {
    if (activeTab === 'backend') {
      fetchBackendLogs();
    }
  }, [activeTab, fetchBackendLogs]);

  // Handle streaming toggle
  useEffect(() => {
    console.log('[STREAMING] Toggle detected. isStreaming:', isStreaming, 'activeTab:', activeTab, 'streamMode:', streamMode);
    
    if (activeTab !== 'backend') {
      console.log('[STREAMING] Not on backend tab, stopping');
      stopStreaming();
      return;
    }

    if (isStreaming) {
      console.log('[STREAMING] Starting stream mode:', streamMode);
      if (streamMode === 'sse') {
        startSSEStream();
      } else {
        startPollingStream();
      }
    }

    return () => {
      stopStreaming();
    };
  }, [isStreaming, streamMode, activeTab, startSSEStream, startPollingStream, stopStreaming]);

  // Frontend log capturing
  useEffect(() => {
    if (!isCapturing) return;

    const addLog = (type: FrontendLog['type'], ...args: any[]) => {
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      setFrontendLogs(prev => [{
        timestamp: new Date().toISOString(),
        type,
        message,
        source: 'console',
      }, ...prev].slice(0, 500));
    };

    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    const origInfo = console.info;

    console.log = (...args) => { addLog('log', ...args); origLog(...args); };
    console.error = (...args) => { addLog('error', ...args); origError(...args); };
    console.warn = (...args) => { addLog('warn', ...args); origWarn(...args); };
    console.info = (...args) => { addLog('info', ...args); origInfo(...args); };

    const errorHandler = (e: ErrorEvent) => {
      addLog('error', `[Unhandled] ${e.message}`);
    };
    window.addEventListener('error', errorHandler);

    const rejectionHandler = (e: PromiseRejectionEvent) => {
      addLog('error', `[Unhandled Promise] ${e.reason}`);
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
      console.info = origInfo;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, [isCapturing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  const filteredBackendLogs = backendLogs.filter(log => {
    const matchesSearch = !searchQuery || 
      log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = !levelFilter || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const filteredFrontendLogs = frontendLogs.filter(log => {
    const matchesSearch = !searchQuery || log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = !levelFilter || log.type === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const levelBadge = (level: string) => {
    const colors: Record<string, string> = {
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      log: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[level] || colors.log;
  };

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {streamError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{streamError}</span>
          <button onClick={() => setStreamError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Server Logs</h1>
              <p className="text-gray-400 text-sm">Real-time backend & frontend logging</p>
            </div>
          </div>
          {activeTab === 'backend' && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                <button 
                  onClick={() => {
                    console.log('[BTN] SSE mode clicked. Current streamMode:', streamMode);
                    setStreamMode('sse');
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium ${streamMode === 'sse' ? 'bg-green-500 text-white' : 'text-gray-300'}`}>
                  SSE
                </button>
                <button 
                  onClick={() => {
                    console.log('[BTN] Poll mode clicked. Current streamMode:', streamMode);
                    setStreamMode('polling');
                  }}
                  className={`px-2 py-1 rounded text-xs font-medium ${streamMode === 'polling' ? 'bg-blue-500 text-white' : 'text-gray-300'}`}>
                  Poll
                </button>
              </div>
              <button 
                onClick={() => {
                  console.log('[BTN] Live/Offline clicked. Current isStreaming:', isStreaming);
                  setIsStreaming(!isStreaming);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${isStreaming ? 'bg-green-500' : 'bg-white/10'}`}>
                {isStreaming ? <Activity className="w-3 h-3 animate-pulse" /> : <Clock className="w-3 h-3" />} 
                {isStreaming ? 'Live' : 'Offline'}
              </button>
              {isStreaming && (
                <button 
                  onClick={() => setStreamPaused(!streamPaused)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${streamPaused ? 'bg-yellow-500' : 'bg-white/10'}`}>
                  {streamPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'backend' ? 'bg-gray-800 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100'}`}>
          <Server className="w-4 h-4" /> Backend {isStreaming && activeTab === 'backend' && <Activity className="w-3 h-3 animate-pulse text-green-400" />}
        </button>
        <button onClick={() => setActiveTab('frontend')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${activeTab === 'frontend' ? 'bg-gray-800 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100'}`}>
          <Monitor className="w-4 h-4" /> Frontend
        </button>
      </div>

      {/* Backend Tab */}
      {activeTab === 'backend' && (
        <>
          <div className="card">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['app', 'error', 'security'] as const).map(type => (
                  <button key={type} onClick={() => setBackendLogType(type)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${backendLogType === type ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500'}`}>
                    {type === 'app' ? '📋 App' : type === 'error' ? '❌ Error' : '🔒 Security'}
                  </button>
                ))}
              </div>
              <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm" />
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm" />
              </div>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 bg-white text-sm">
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
              </select>
              <button onClick={fetchBackendLogs} disabled={isLoading}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex-wrap flex gap-3">
              {isStreaming && <span className="text-green-500">🟢 {streamMode === 'sse' ? 'Streaming (SSE)' : 'Polling (5s)'} {streamPaused && '- PAUSED'}</span>}
              {connectionStatus === 'connecting' && <span className="text-yellow-500">🟡 Connecting...</span>}
              {connectionStatus === 'error' && <span className="text-red-500">🔴 Connection Error</span>}
              {!isStreaming && connectionStatus === 'idle' && <span className="text-gray-400">⚪ Offline</span>}
              {token && <span className="text-gray-600">Auth: OK</span>}
              {!token && <span className="text-red-500">Auth: MISSING</span>}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                  <tr className="text-left text-gray-500 text-xs">
                    <th className="py-2 px-3 font-medium w-40">Timestamp</th>
                    <th className="py-2 px-3 font-medium w-20">Level</th>
                    <th className="py-2 px-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-xs">
                  {filteredBackendLogs.length > 0 ? filteredBackendLogs.map((log, i) => (
                    <tr key={i} onClick={() => setSelectedLog(log)} className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${log.level === 'error' ? 'bg-red-50/50' : ''}`}>
                      <td className="py-1.5 px-3 text-gray-500 whitespace-nowrap">{log.timestamp?.substring(11, 19) || '-'}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelBadge(log.level)}`}>{log.level}</span>
                      </td>
                      <td className="py-1.5 px-3 text-gray-800 dark:text-gray-200 truncate">{log.message}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-8 text-center text-gray-500">No logs</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Frontend Tab */}
      {activeTab === 'frontend' && (
        <>
          <div className="card">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm" />
              </div>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 bg-white text-sm">
                <option value="">All</option>
                <option value="error">Error</option>
                <option value="warn">Warn</option>
                <option value="info">Info</option>
                <option value="log">Log</option>
              </select>
              <button onClick={() => setIsCapturing(!isCapturing)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${isCapturing ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                {isCapturing ? '◉' : '○'}
              </button>
              <button onClick={() => setFrontendLogs([])} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm">Clear</button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10">
                  <tr className="text-left text-gray-500 text-xs">
                    <th className="py-2 px-3 font-medium w-40">Time</th>
                    <th className="py-2 px-3 font-medium w-16">Type</th>
                    <th className="py-2 px-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-xs">
                  {filteredFrontendLogs.length > 0 ? filteredFrontendLogs.map((log, i) => (
                    <tr key={i} onClick={() => setSelectedLog(log)} className={`hover:bg-gray-50 cursor-pointer ${log.type === 'error' ? 'bg-red-50/50' : ''}`}>
                      <td className="py-1.5 px-3 text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-1.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelBadge(log.type)}`}>{log.type}</span>
                      </td>
                      <td className="py-1.5 px-3 truncate">{log.message}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-8 text-center text-gray-500">No logs captured</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Details
              </h2>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-xs overflow-x-auto">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
