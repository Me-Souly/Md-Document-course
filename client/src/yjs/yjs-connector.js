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
export function createNoteConnection({ noteId, token, wsUrl }) {
    const doc = new Y.Doc();

    const host = wsUrl || "ws://localhost:5000";
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
