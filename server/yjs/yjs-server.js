// yjs-server.js
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import { createRequire } from "module";
import { noteService, noteAccessService, tokenService, redisService } from "../services/index.js";

const require = createRequire(import.meta.url);
const { setupWSConnection, getYDoc } = require("y-websocket/bin/utils");
const syncProtocol = require("y-protocols/sync");
const encoding = require("lib0/encoding");
const decoding = require("lib0/decoding");

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;

const docStateMap = new WeakMap();

// =======================
// Presence по заметкам
// =======================
// noteId -> Map<userId, connectionCount>
const presenceByNote = new Map();
// ws -> { noteId, userId }
const connectionPresence = new WeakMap();

const toUint8Array = (message) => {
  if (message instanceof Uint8Array) return message;
  if (Array.isArray(message)) return Uint8Array.from(message);
  if (message instanceof ArrayBuffer) return new Uint8Array(message);
  if (Buffer.isBuffer(message)) return new Uint8Array(message);
  return null;
};

const shouldBlockUpdateFromReadOnly = (message) => {
  try {
    const uint8Message = toUint8Array(message);
    if (!uint8Message || uint8Message.length === 0) {
      return false;
    }
    const decoder = decoding.createDecoder(uint8Message);
    const messageType = decoding.readVarUint(decoder);

    if (messageType === messageSync) {
      const syncMessageType = decoding.readVarUint(decoder);
      return syncMessageType === syncProtocol.messageYjsUpdate;
    }

    // Разрешаем awareness/messages
    if (messageType === messageAwareness || messageType === messageAuth) {
      return false;
    }

    return false;
  } catch (error) {
    console.error('[YJS] Ошибка разбора сообщения read-only клиента:', error);
    // На всякий случай блокируем, чтобы не допустить изменений
    return true;
  }
};

const getDocState = (docName, doc) => {
  let state = docStateMap.get(doc);
  if (!state) {
    state = {
      isDbStateLoaded: false,
      isUpdateHandlerAttached: false,
      docName,
    };
    docStateMap.set(doc, state);
  }
  return state;
};

export const setupYjs = (server) => {
  const wss = new WebSocketServer({ server });

  const registerPresence = (noteId, userId, ws) => {
    let usersMap = presenceByNote.get(noteId);
    if (!usersMap) {
      usersMap = new Map();
      presenceByNote.set(noteId, usersMap);
    }
    const current = usersMap.get(userId) || 0;
    usersMap.set(userId, current + 1);
    connectionPresence.set(ws, { noteId, userId });
  };

  const unregisterPresence = (ws) => {
    const info = connectionPresence.get(ws);
    if (!info) return;
    const { noteId, userId } = info;
    const usersMap = presenceByNote.get(noteId);
    if (!usersMap) {
      connectionPresence.delete(ws);
      return;
    }
    const current = usersMap.get(userId) || 0;
    if (current <= 1) {
      usersMap.delete(userId);
    } else {
      usersMap.set(userId, current - 1);
    }
    if (usersMap.size === 0) {
      presenceByNote.delete(noteId);
    }
    connectionPresence.delete(ws);
  };

  wss.on("connection", async (ws, req) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname || "/";
      if (!pathname.startsWith("/yjs")) {
        ws.close(1008, "Invalid path");
        return;
      }

      const noteId = url.searchParams.get("noteId");
      const token = url.searchParams.get("token");

      if (!noteId) {
        ws.close(1008, "NoteId is required");
        return;
      }

      // Проверка JWT токена
      if (!token) {
        ws.close(1008, "Token is required");
        return;
      }

      const userData = tokenService.validateAccessToken(token);
      if (!userData || !userData.id) {
        ws.close(1008, "Invalid token");
        return;
      }

      const userId = userData.id;

      // Проверка прав доступа к заметке
      const permission = await noteAccessService.getUserPermissionForNote(userId, noteId);
      if (!permission) {
        ws.close(1008, "Access denied");
        return;
      }
      const isReadOnly = permission !== 'edit';

      const docName = `yjs/${noteId}`;

      // Регистрируем presence для этой WS-сессии
      registerPresence(noteId, userId, ws);
      
      // Получаем или создаем документ
      const sharedDoc = getYDoc(docName);
      const docState = getDocState(docName, sharedDoc);
      
      // Проверяем текущее состояние документа
      const currentContent = sharedDoc.getText("content").toString();
      console.log(`[YJS] Текущее состояние документа ${docName}: ${currentContent.length} символов`);
      
      // Загружаем состояние из БД, если документ пустой (даже если уже был загружен ранее)
      // Это нужно, т.к. документ может быть уничтожен после отключения всех клиентов
      let stateLoaded = false;
      if (currentContent.length === 0) {
        console.log(`[YJS] Документ ${docName} пустой, загрузка состояния...`);
        
        // СНАЧАЛА проверяем Redis кэш (быстро)
        let savedState = await redisService.getYjsState(noteId);
        let noteData = null;
        
        if (savedState) {
          console.log(`[YJS] ✓ Состояние найдено в Redis кэше, размер: ${savedState.length} байт`);
        } else {
          // Если нет в кэше, загружаем из MongoDB
          console.log(`[YJS] Состояние не найдено в Redis, загрузка из MongoDB...`);
          noteData = await noteService.getNoteById(noteId);
        
          if (noteData) {
            console.log(`[YJS] ✓ Заметка ${noteId} успешно загружена из БД`);
            console.log(`[YJS] Данные заметки:`, {
              id: noteData._id || noteData.id,
              title: noteData.title,
              hasYdocState: !!noteData.ydocState,
              ydocStateType: noteData.ydocState ? noteData.ydocState.constructor.name : 'null',
              ydocStateLength: noteData.ydocState ? noteData.ydocState.length : 0
            });
            
            // Применяем состояние из БД, если оно есть
            if (noteData.ydocState) {
              // Убеждаемся, что это Buffer или Uint8Array
              if (Buffer.isBuffer(noteData.ydocState)) {
                savedState = noteData.ydocState;
                console.log(`[YJS] ✓ Найдено сохраненное состояние YJS (Buffer), размер: ${savedState.length} байт`);
              } else if (noteData.ydocState instanceof Uint8Array) {
                savedState = noteData.ydocState;
                console.log(`[YJS] ✓ Найдено сохраненное состояние YJS (Uint8Array), размер: ${savedState.length} байт`);
              } else { 
                console.log(`[YJS] ⚠ ydocState имеет неожиданный тип: ${noteData.ydocState.constructor.name}`);
                // Пытаемся преобразовать
                try {
                  savedState = Buffer.from(noteData.ydocState);
                  console.log(`[YJS] ✓ Преобразовано в Buffer, размер: ${savedState.length} байт`);
                } catch (e) {
                  console.error(`[YJS] ✗ Ошибка преобразования ydocState:`, e);
                }
              }
              
              // Сохраняем в Redis кэш для следующих разов
              if (savedState) {
                await redisService.setYjsState(noteId, savedState);
              }
            } else {
              console.log(`[YJS] ⚠ Заметка найдена, но нет сохраненного состояния YJS (ydocState = null/undefined)`);
            }
          } else {
            console.log(`[YJS] ✗ Заметка ${noteId} не найдена в БД`);
          }
        }
        
        // Применяем состояние к документу (из Redis или MongoDB)
        if (savedState) {
          console.log(`[YJS] Применение состояния к документу ${docName}...`);
              console.log(`[YJS] Содержимое sharedDoc до применения:`, sharedDoc.toJSON());
              
              // Проверяем первые байты сохранённого состояния для диагностики
              const firstBytes = Array.from(savedState.slice(0, Math.min(20, savedState.length)));
              console.log(`[YJS] Первые байты сохранённого состояния:`, firstBytes);
              
              // Проверяем, что в сохранённом состоянии
              const tempDoc = new Y.Doc();
              try {
                Y.applyUpdate(tempDoc, savedState);
                const tempContent = tempDoc.getText("content").toString();
                console.log(`[YJS] Проверка состояния из БД: длина текста = ${tempContent.length}`);
                console.log(`[YJS] tempDoc.toJSON():`, tempDoc.toJSON());
                
                // Проверяем все типы данных в tempDoc
                const allKeys = Array.from(tempDoc.share.keys());
                console.log(`[YJS] Все ключи в tempDoc:`, allKeys);
                allKeys.forEach(key => {
                  const item = tempDoc.get(key);
                  const itemType = item?.constructor?.name || 'unknown';
                  console.log(`[YJS] tempDoc["${key}"]: тип = ${itemType}`);
                  // Y.Text может называться 'Text' или 'YText' в зависимости от версии
                  if (itemType === 'Text' || itemType === 'YText' || (item && typeof item.toString === 'function' && typeof item.insert === 'function')) {
                    const textValue = item.toString();
                    console.log(`[YJS]   Текст: длина = ${textValue.length}, первые 100 символов: "${textValue.substring(0, 100)}"`);
                  } else if (itemType === 'Map' || itemType === 'YMap') {
                    console.log(`[YJS]   Map: размер = ${item.size}`);
                  } else if (itemType === 'Array' || itemType === 'YArray') {
                    console.log(`[YJS]   Array: длина = ${item.length}`);
                  } else {
                    console.log(`[YJS]   Неизвестный тип, методы:`, Object.getOwnPropertyNames(item).filter(name => typeof item[name] === 'function').slice(0, 5));
                  }
                });
              } catch (e) {
                console.error(`[YJS] Ошибка при применении к tempDoc:`, e);
              }
              
              const tempContent = tempDoc.getText("content").toString();
              console.log(`[YJS] tempContent после применения к tempDoc: длина = ${tempContent.length}`);
              
              // Если размер состояния большой, но текст пустой - возможно проблема с декодированием
              if (savedState.length > 100 && tempContent.length === 0) {
                console.log(`[YJS] ⚠ ПРОБЛЕМА: Состояние большое (${savedState.length} байт), но текст пустой!`);
                console.log(`[YJS] Это может означать, что состояние сохранилось неправильно или портится при загрузке из MongoDB`);
                console.log(`[YJS] Проверьте логи сохранения - сохраняется ли текст при записи в БД`);
                
                // Пробуем альтернативный способ - может быть Buffer портится при загрузке
                // Конвертируем Buffer в Uint8Array заново
                try {
                  const uint8State = new Uint8Array(savedState);
                  const altDoc = new Y.Doc();
                  Y.applyUpdate(altDoc, uint8State);
                  const altContent = altDoc.getText("content").toString();
                  console.log(`[YJS] Альтернативный способ (Uint8Array): длина текста = ${altContent.length}`);
                  if (altContent.length > 0) {
                    console.log(`[YJS] ✓ Найден текст через альтернативный способ!`);
                    sharedDoc.transact(() => {
                      const text = sharedDoc.getText("content");
                      text.delete(0, text.length);
                      text.insert(0, altContent);
                    }, null);
                    const afterAlt = sharedDoc.getText("content").toString();
                    console.log(`[YJS] Текст применён альтернативным способом: ${afterAlt.length} символов`);
                    if (afterAlt.length > 0) {
                      stateLoaded = true;
                    }
                  }
                } catch (e) {
                  console.error(`[YJS] Ошибка альтернативного способа:`, e);
                }
              }
              
              // Если в tempDoc есть текст, но applyUpdate не работает, используем прямое копирование
              if (tempContent.length > 0) {
                console.log(`[YJS] В tempDoc найден текст (${tempContent.length} символов), применяем напрямую через транзакцию`);
                sharedDoc.transact(() => {
                  const text = sharedDoc.getText("content");
                  text.delete(0, text.length);
                  text.insert(0, tempContent);
                }, null);
                const afterDirect = sharedDoc.getText("content").toString();
                console.log(`[YJS] Текст применён напрямую: ${afterDirect.length} символов`);
                if (afterDirect.length > 0) {
                  stateLoaded = true;
                }
              } else {
                // Пробуем стандартный способ
                try {
                  Y.applyUpdate(sharedDoc, savedState, null);
                  console.log(`[YJS] Содержимое sharedDoc после применения:`, sharedDoc.toJSON());
                } catch (e) {
                  console.error(`[YJS] Ошибка при применении через applyUpdate:`, e);
                  // Пробуем альтернативный способ - через транзакцию
                  sharedDoc.transact(() => {
                    Y.applyUpdate(sharedDoc, savedState, null);
                  }, null);
                  console.log(`[YJS] Применено через транзакцию`);
                }
              }
              
              // Проверяем, что состояние применилось
              const afterContent = sharedDoc.getText("content").toString();
              console.log(`[YJS] ✓ Состояние применено! Содержимое после применения: ${afterContent.length} символов`);
              if (afterContent.length > 0) {
                console.log(`[YJS] Первые 100 символов: ${afterContent.substring(0, 100)}...`);
                stateLoaded = true;
              } else {
                if (tempContent.length > 0) {
                  console.log(`[YJS] ⚠ После applyUpdate текст отсутствует, но tempDoc содержит ${tempContent.length} символов. Применяем tempContent вручную.`);
                  sharedDoc.transact(() => {
                    const text = sharedDoc.getText("content");
                    text.delete(0, text.length);
                    text.insert(0, tempContent);
                  }, null);
                  const afterTempContent = sharedDoc.getText("content").toString();
                  console.log(`[YJS] ✓ tempContent импортирован вручную, длина: ${afterTempContent.length} символов`);
                  console.log(`[YJS] Содержимое sharedDoc после tempContent:`, sharedDoc.toJSON());
                  if (afterTempContent.length > 0) {
                    stateLoaded = true;
                  }
                }
                const fallbackContent = (noteData && typeof noteData.content === 'string') ? noteData.content : '';
                if (fallbackContent.length > 0) {
                  console.log(`[YJS] ⚠ Состояние пустое, но есть поле content (${fallbackContent.length} символов). Импортируем в Y.Doc.`);
                  sharedDoc.transact(() => {
                    const text = sharedDoc.getText("content");
                    text.delete(0, text.length);
                    text.insert(0, fallbackContent);
                  }, null);
                  const afterFallback = sharedDoc.getText("content").toString();
                  console.log(`[YJS] ✓ Контент из поля content импортирован, длина: ${afterFallback.length} символов`);
                  if (afterFallback.length > 0) {
                    stateLoaded = true;
                  }
                }
              }
            }
      } else {
        console.log(`[YJS] Документ ${docName} уже содержит данные (${currentContent.length} символов), пропуск загрузки из БД`);
        stateLoaded = true; // Документ уже содержит данные
      }
      
      // Ждём, пока состояние загрузится (если нужно)
      if (!stateLoaded && currentContent.length === 0) {
        // Даём небольшую задержку для применения состояния
        await new Promise(resolve => setTimeout(resolve, 50));
        const finalCheck = sharedDoc.getText("content").toString();
        if (finalCheck.length > 0) {
          stateLoaded = true;
          console.log(`[YJS] Состояние применено после задержки: ${finalCheck.length} символов`);
        }
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Применяем состояние из БД ДО регистрации обработчика update
      // и ДО подключения клиента, чтобы избежать race condition
      const contentBeforeHandler = sharedDoc.getText("content").toString();
      console.log(`[YJS] Состояние документа перед регистрацией обработчика: ${contentBeforeHandler.length} символов`);

      // Настраиваем обработчик сохранения только один раз на живой doc instance
      // НО ТОЛЬКО ПОСЛЕ того, как состояние из БД применено
      if (!docState.isUpdateHandlerAttached) {
        console.log(`[YJS] Регистрация обработчика update для документа ${docName}`);
        
        const SAVE_DEBOUNCE_MS = 2000;
        // Debounce для сохранения - сохраняем не чаще чем раз в SAVE_DEBOUNCE_MS
        let saveTimeout = null;
        const debouncedSave = async () => {
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }
          saveTimeout = setTimeout(async () => {
            await saveDocState();
          }, SAVE_DEBOUNCE_MS);
        };
        
        const saveDocState = async () => {
          try {
            const currentText = sharedDoc.getText("content").toString();
            if (currentText.length === 0) {
              return; // Не сохраняем пустое состояние
            }
            
            // Кодируем текущее состояние (note-service.js создаст snapshot если нужно)
            const state = Y.encodeStateAsUpdate(sharedDoc);
            
            // Проверяем, что состояние корректно
            const testDoc = new Y.Doc();
            Y.applyUpdate(testDoc, state);
            const testText = testDoc.getText("content").toString();
            
            if (testText.length === 0) {
              console.log(`[YJS] ⚠ Пропуск сохранения: в закодированном состоянии нет текста`);
              return;
            }
            
            // note-service.js автоматически создаст snapshot если размер превышает порог
            await noteService.saveYDocState(noteId, state);
            // Обновляем Redis кэш
            await redisService.setYjsState(noteId, state);
            console.log(`[YJS] ✓ Сохранено в БД и Redis для заметки ${noteId}, размер: ${state.length} байт, текст: ${testText.length} символов`);
          } catch (err) {
            console.error(`[YJS] ✗ Ошибка сохранения в БД:`, err.message);
          }
        };
        
        const updateHandler = async (update, origin) => {
          // Игнорируем обновления, которые мы сами применили из БД (origin = null)
          if (origin === null) {
            console.log(`[YJS] Пропуск сохранения: origin = null (загрузка из БД)`);
            return;
          }
          
          console.log(`[YJS] ========== ОБНОВЛЕНИЕ ДОКУМЕНТА ==========`);
          console.log(`[YJS] origin:`, origin?.constructor?.name || origin || 'unknown');
          console.log(`[YJS] update размер:`, update?.length || 0, 'байт');
          
          try {
            // Ждём немного, чтобы убедиться, что транзакция завершена
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const currentText = sharedDoc.getText("content").toString();
            console.log(`[YJS] Текущий текст в sharedDoc: длина = ${currentText.length}, первые 50 символов: "${currentText.substring(0, 50)}"`);
            
            // Проверяем все ключи в документе
            const allKeys = Array.from(sharedDoc.share.keys());
            console.log(`[YJS] Все ключи в sharedDoc:`, allKeys);
            allKeys.forEach(key => {
              const item = sharedDoc.get(key);
              const type = item?.constructor?.name || 'unknown';
              if (type === 'YText' || type === 'Text') {
                const text = item.toString();
                console.log(`[YJS]   ${key} (${type}): длина = ${text.length}`);
              }
            });
            
            // НЕ сохраняем, если текст пустой
            if (currentText.length === 0) {
              console.log(`[YJS] ⚠ Пропуск сохранения: текст пустой`);
              return;
            }
            
            const state = Y.encodeStateAsUpdate(sharedDoc);
            console.log(`[YJS] Закодировано состояние, размер: ${state.length} байт`);
            
            // Проверяем, что в закодированном состоянии
            const testDoc = new Y.Doc();
            Y.applyUpdate(testDoc, state);
            const testText = testDoc.getText("content").toString();
            console.log(`[YJS] Проверка закодированного состояния: длина текста = ${testText.length}, первые 50 символов: "${testText.substring(0, 50)}"`);
            
            // Проверяем все ключи в testDoc
            const testKeys = Array.from(testDoc.share.keys());
            console.log(`[YJS] Все ключи в testDoc:`, testKeys);
            testKeys.forEach(key => {
              const item = testDoc.get(key);
              const type = item?.constructor?.name || 'unknown';
              if (type === 'YText' || type === 'Text') {
                const text = item.toString();
                console.log(`[YJS]   ${key} (${type}): длина = ${text.length}`);
              }
            });
            
            // Используем debounced save вместо прямого сохранения
            // Это гарантирует, что состояние сохранится через 1 секунду после последнего обновления
            debouncedSave();
            console.log(`[YJS] ==========================================`);
          } catch (err) {
            console.error(`[YJS] ✗ Ошибка в обработчике update:`, err.message);
            console.error(`[YJS] Stack:`, err.stack);
          }
        };
        
        // Сохраняем состояние при отключении всех клиентов
        const checkAndSaveOnDisconnect = () => {
          // Проверяем количество подключений
          const activeConnections = sharedDoc.conns?.size || 0;
          console.log(`[YJS] Проверка подключений для ${docName}: ${activeConnections} активных`);
          
          // Если это последнее подключение, сохраняем немедленно
          if (activeConnections <= 1) {
            console.log(`[YJS] Последнее подключение закрывается, сохраняем состояние немедленно...`);
            if (saveTimeout) {
              clearTimeout(saveTimeout);
            }
            saveDocState();
          }
        };
        
        // Сохраняем ссылку на функцию для вызова при отключении
        docState.saveDocState = saveDocState;
        docState.checkAndSaveOnDisconnect = checkAndSaveOnDisconnect;

        sharedDoc.on("update", updateHandler);
        docState.isUpdateHandlerAttached = true;
        docState.updateHandler = updateHandler;
        console.log(`[YJS] Обработчик update зарегистрирован для документа ${docName}`);
      } else {
        console.log(`[YJS] Обработчик update уже зарегистрирован для документа ${docName}`);
      }

      // КРИТИЧЕСКИ ВАЖНО: Финальная проверка и применение состояния ПЕРЕД подключением клиента
      // setupWSConnection сразу отправляет состояние клиенту, поэтому оно ДОЛЖНО быть применено
      let finalContent = sharedDoc.getText("content").toString();
      console.log(`[YJS] Финальная проверка перед подключением клиента: ${finalContent.length} символов`);
      
      // Если документ всё ещё пустой, пытаемся загрузить из БД ещё раз
      if (finalContent.length === 0) {
        console.log(`[YJS] ⚠ Документ пустой перед подключением, загружаем из БД ещё раз...`);
        const noteData = await noteService.getNoteById(noteId);
        if (noteData?.ydocState) {
          let savedState = null;
          if (Buffer.isBuffer(noteData.ydocState)) {
            savedState = noteData.ydocState;
          } else if (noteData.ydocState instanceof Uint8Array) {
            savedState = noteData.ydocState;
          } else {
            try {
              savedState = Buffer.from(noteData.ydocState);
            } catch (e) {
              console.error(`[YJS] Ошибка преобразования:`, e);
            }
          }
          
          if (savedState) {
            console.log(`[YJS] Применяем состояние из БД перед подключением клиента...`);
            Y.applyUpdate(sharedDoc, savedState, null);
            finalContent = sharedDoc.getText("content").toString();
            console.log(`[YJS] Состояние применено: ${finalContent.length} символов`);
            
            // Если всё ещё пусто, пробуем через транзакцию
            if (finalContent.length === 0) {
              const tempDoc = new Y.Doc();
              Y.applyUpdate(tempDoc, savedState);
              const tempText = tempDoc.getText("content").toString();
              if (tempText.length > 0) {
                console.log(`[YJS] Применяем через транзакцию: ${tempText.length} символов`);
                sharedDoc.transact(() => {
                  const text = sharedDoc.getText("content");
                  text.delete(0, text.length);
                  text.insert(0, tempText);
                }, null);
                finalContent = sharedDoc.getText("content").toString();
              }
            }
          }
        }
      }
      
      console.log(`[YJS] Подключение клиента к документу ${docName}, текущее содержимое: ${finalContent.length} символов, readOnly=${isReadOnly}`);

      if (isReadOnly) {
        // Оборачиваем обработчики сообщений, чтобы блокировать попытки записи
        const originalOn = ws.on.bind(ws);
        ws.on = (event, listener) => {
          if (event === 'message') {
            const wrapped = (message, ...args) => {
              if (shouldBlockUpdateFromReadOnly(message)) {
                console.log('[YJS] Блокируем попытку записи от read-only клиента');
                return;
              }
              listener(message, ...args);
            };
            return originalOn(event, wrapped);
          }
          return originalOn(event, listener);
        };
      }
      
      if (finalContent.length > 0) {
        console.log(`[YJS] Первые 100 символов для отправки клиенту: "${finalContent.substring(0, 100)}"`);
      }
      
      // КРИТИЧЕСКИ ВАЖНО: Убеждаемся, что состояние применено ДО подключения клиента
      // Если состояние всё ещё пустое, но в БД есть - применяем принудительно
      if (finalContent.length === 0) {
        console.log(`[YJS] ⚠ Документ пустой перед подключением, последняя попытка загрузки из БД...`);
        const lastAttempt = await noteService.getNoteById(noteId);
        if (lastAttempt?.ydocState) {
          let lastState = null;
          if (Buffer.isBuffer(lastAttempt.ydocState)) {
            lastState = new Uint8Array(lastAttempt.ydocState);
          } else if (lastAttempt.ydocState instanceof Uint8Array) {
            lastState = lastAttempt.ydocState;
          } else {
            lastState = new Uint8Array(Buffer.from(lastAttempt.ydocState));
          }
          
          if (lastState) {
            console.log(`[YJS] Принудительное применение состояния перед подключением...`);
            // Пробуем применить напрямую через транзакцию
            const tempDoc = new Y.Doc();
            Y.applyUpdate(tempDoc, lastState);
            const tempText = tempDoc.getText("content").toString();
            
            if (tempText.length > 0) {
              console.log(`[YJS] Найден текст в состоянии (${tempText.length} символов), применяем напрямую...`);
              sharedDoc.transact(() => {
                const text = sharedDoc.getText("content");
                text.delete(0, text.length);
                text.insert(0, tempText);
              }, null);
              finalContent = sharedDoc.getText("content").toString();
              console.log(`[YJS] Текст применён: ${finalContent.length} символов`);
            } else {
              console.log(`[YJS] ⚠ В состоянии из БД нет текста (размер: ${lastState.length} байт, но текст пустой)`);
              console.log(`[YJS] Это означает, что состояние было сохранено пустым. Проверьте логи сохранения.`);
            }
          }
        }
      }
      
      // Кодируем состояние для проверки перед отправкой
      const stateToSend = Y.encodeStateAsUpdate(sharedDoc);
      const testDocForSend = new Y.Doc();
      Y.applyUpdate(testDocForSend, stateToSend);
      const testContentForSend = testDocForSend.getText("content").toString();
      console.log(`[YJS] ФИНАЛЬНАЯ проверка состояния перед отправкой клиенту: длина = ${testContentForSend.length} символов`);
      
      if (testContentForSend.length > 0) {
        console.log(`[YJS] ✓ Состояние готово к отправке клиенту: "${testContentForSend.substring(0, 50)}..."`);
      } else {
        console.log(`[YJS] ⚠ ВНИМАНИЕ: Состояние пустое, клиент получит пустой документ!`);
      }
      
      console.log(`[YJS] Вызов setupWSConnection для документа ${docName}...`);
      console.log(`[YJS] Состояние документа перед setupWSConnection: ${finalContent.length} символов`);
      console.log(`[YJS] Количество активных подключений до: ${sharedDoc.conns?.size || 0}`);
      
      // Перехватываем отправку сообщений клиенту для логирования
      const originalSend = ws.send;
      let messageCount = 0;
      ws.send = function(data, ...args) {
        messageCount++;
        if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
          const size = data.length;
          // Первые байты сообщения для определения типа
          const firstBytes = Array.from(new Uint8Array(data.slice(0, Math.min(10, size))));
          console.log(`[YJS] Отправка сообщения #${messageCount} клиенту: размер = ${size} байт, первые байты: [${firstBytes.join(', ')}]`);
          
          // Проверяем, это sync сообщение (тип 0) или awareness (тип 1)
          if (size > 0) {
            const messageType = firstBytes[0];
            if (messageType === 0) {
              console.log(`[YJS]   → Это SYNC сообщение (тип 0)`);
            } else if (messageType === 1) {
              console.log(`[YJS]   → Это AWARENESS сообщение (тип 1)`);
            }
          }
        } else {
          console.log(`[YJS] Отправка сообщения #${messageCount} клиенту: тип = ${typeof data}`);
        }
        return originalSend.apply(this, [data, ...args]);
      };
      
      setupWSConnection(ws, req, { docName });
      
      // Принудительно отправляем sync step 2 через небольшую задержку, если состояние есть
      // Это гарантирует, что клиент получит полное состояние даже если не ответит на sync step 1
      // Задержка нужна, чтобы дать время нормальному протоколу синхронизации сработать
      setTimeout(() => {
        const afterSetupContent = sharedDoc.getText("content").toString();
        const activeConnections = sharedDoc.conns?.size || 0;
        console.log(`[YJS] После setupWSConnection (через 200мс):`);
        console.log(`[YJS]   - Состояние документа: ${afterSetupContent.length} символов`);
        console.log(`[YJS]   - Активных подключений: ${activeConnections}`);
        console.log(`[YJS]   - Отправлено сообщений клиенту: ${messageCount}`);
        
        if (afterSetupContent.length > 0 && activeConnections > 0 && ws.readyState === 1) { // 1 = OPEN
          // Проверяем, не отправили ли уже sync step 2 через нормальный протокол
          // Если отправили много сообщений (>3), возможно уже синхронизировались
          if (messageCount <= 3) {
            console.log(`[YJS] Принудительная отправка sync step 2 с полным состоянием (нормальный протокол не сработал)...`);
            try {
              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, 0); // messageSync
              syncProtocol.writeSyncStep2(encoder, sharedDoc);
              const syncStep2Message = encoding.toUint8Array(encoder);
              ws.send(syncStep2Message);
              console.log(`[YJS] ✓ Sync step 2 отправлен клиенту, размер: ${syncStep2Message.length} байт`);
              console.log(`[YJS] Клиент должен получить полное состояние документа (${afterSetupContent.length} символов)`);
            } catch (e) {
              console.error(`[YJS] Ошибка при отправке sync step 2:`, e);
            }
          } else {
            console.log(`[YJS] Много сообщений отправлено (${messageCount}), возможно уже синхронизировались, пропускаем принудительную отправку`);
          }
        } else if (afterSetupContent.length === 0) {
          console.log(`[YJS]   ⚠ ПРОБЛЕМА: Состояние пустое! Клиент получит пустой документ.`);
          console.log(`[YJS]   ⚠ Это означает, что состояние из БД не применилось или его нет в БД.`);
        }
      }, 200);
      
      console.log(`[YJS] ✓ Клиент подключен к документу ${docName}`);
      
      // Добавляем обработчик на отключение клиента для сохранения состояния
      ws.on('close', () => {
        console.log(`[YJS] Клиент отключился от документа ${docName}`);
        // Обновляем presence по отключению
        unregisterPresence(ws);
        const activeConnections = sharedDoc.conns?.size || 0;
        console.log(`[YJS] Активных подключений осталось: ${activeConnections}`);
        
        // Если это было последнее подключение, сохраняем состояние немедленно
        if (activeConnections === 0 && docState.saveDocState) {
          console.log(`[YJS] Последнее подключение закрыто, сохраняем состояние...`);
          // Небольшая задержка, чтобы убедиться, что все обновления применены
          setTimeout(() => {
            docState.saveDocState();
          }, 100);
        } else if (docState.checkAndSaveOnDisconnect) {
          // Проверяем и сохраняем через debounce
          docState.checkAndSaveOnDisconnect();
        }
      });

    } catch (error) {
      console.error("WebSocket connection error:", error);
      ws.close(1011, "Internal server error");
    }
  });
};

export const saveAllActiveDocs = async () => {
  // В текущей реализации y-websocket управляет документами самостоятельно.
  // При необходимости можно расширить и сохранять документы по docName.
};

// Возвращает список userId, у которых сейчас есть хотя бы одно активное WS‑подключение к noteId
export const getNotePresence = (noteId) => {
  const usersMap = presenceByNote.get(noteId);
  if (!usersMap) return [];
  return Array.from(usersMap.entries())
    .filter(([, count]) => count > 0)
    .map(([userId]) => userId);
};
