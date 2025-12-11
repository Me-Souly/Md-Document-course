// yjs/yjs-connector.js
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

/**
 * Создает соединение YJS для заметки
 * @param {Object} options
 * @param {string} options.noteId - ID заметки
 * @param {string} options.token - JWT токен для авторизации
 * @param {string} options.wsUrl - URL WebSocket сервера (опционально)
 * @returns {Object} Объект с doc, provider, text и методом destroy
 */
function resolveWsHost(wsUrl) {
    // 1) env override
    if (wsUrl) return wsUrl;
    // 2) derive from current origin (works for phone in одной сети)
    if (typeof window !== 'undefined' && window.location) {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = process.env.REACT_APP_WS_PORT || '5000';
        return `${proto}://${host}:${port}`;
    }
    // 3) fallback
    return "ws://localhost:5000";
}

export function createNoteConnection({ noteId, token, wsUrl }) {
    const doc = new Y.Doc();

    const host = resolveWsHost(wsUrl);
    const room = `yjs/${noteId}`;

    const provider = new WebsocketProvider(host, room, doc, {
        connect: true,
        params: {
            noteId,
            token
        }
    });

    const text = doc.getText("content");
    const fragment = doc.getXmlFragment("prosemirror");
    console.log(`[yjs-connector] Создание соединения для заметки ${noteId}`);

    // Логируем события provider
    if (provider && typeof provider.on === 'function') {
        provider.on('status', (event) => {
            console.log(`[yjs-connector] Provider status: ${event.status}`);
        });
        provider.on('sync', (isSynced) => {
            console.log(`[yjs-connector] Provider sync: ${isSynced}`);
            if (isSynced) {
                const syncedText = text.toString();
                console.log(`[yjs-connector] Текст после sync: длина = ${syncedText.length}, первые 50 символов: "${syncedText.substring(0, 50)}"`);
            }
        });
    }

    return {
        doc,
        provider,
        text,
        fragment,
        destroy() {
            console.log(`[yjs-connector] Уничтожение соединения для заметки ${noteId}`);
            if (provider) {
                provider.disconnect();
                if (typeof provider.destroy === 'function') {
                    provider.destroy();
                }
            }
            if (doc && typeof doc.destroy === 'function') {
                doc.destroy();
            }
        }
    };
}
