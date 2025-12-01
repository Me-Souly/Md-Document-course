import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Editor, defaultValueCtx, editorViewCtx, parserCtx, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { slashFactory } from '@milkdown/plugin-slash';
import { tooltipFactory } from '@milkdown/plugin-tooltip';
import { Ctx } from '@milkdown/ctx';
import { EditorState } from 'prosemirror-state';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { keymap } from 'prosemirror-keymap';
import { createNoteConnection } from '../yjs/yjs-connector.js';
import styles from './MilkdownEditor.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

type MilkdownEditorProps = {
  noteId: string;
  readOnly?: boolean;
  placeholder?: string;
  onContentChange?: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
  className?: string;
  getToken?: () => string | null;
  // Optional shared Yjs connection (for split mode optimization)
  sharedConnection?: {
    doc: any;
    provider: any;
    text: any;
  };
  // Indicates that parent component will provide a shared connection (split mode preview)
  expectSharedConnection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

type ConnectionType = {
  doc: any;
  provider: any;
  text: any;
  destroy: () => void;
};

// Внутренний компонент, который использует useEditor внутри MilkdownProvider
const MilkdownEditorInner: React.FC<MilkdownEditorProps> = ({
  noteId,
  readOnly = false,
  placeholder = 'Введите текст…',
  onContentChange,
  className,
  getToken,
  sharedConnection,
  expectSharedConnection = false,
  onUndo,
  onRedo
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const connectionRef = useRef<ConnectionType | null>(null);
  const yTextRef = useRef<any>(null);
  const observerRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<any>(null);
  const applyingRemoteRef = useRef(false);
  const lastMarkdownRef = useRef('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isUserTypingRef = useRef(false);

  const { get, loading } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, '');
      })
      .use(commonmark)
      .use(listener)
      .use(slashFactory('slash'))
      .use(tooltipFactory('tooltip'))
  );

  const effectiveReadOnly = useMemo(
    () => (expectSharedConnection ? false : readOnly),
    [expectSharedConnection, readOnly]
  );

  // Отключаем встроенные undo/redo keymap и добавляем плагины для drag-and-drop
  useEffect(() => {
    if (loading) return;
    
    const editor = editorRef.current;
    if (!editor) return;

    try {
      editor.action((ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        // Получаем текущее состояние
        const state = view.state;
        const plugins = state.plugins;

        // Создаем кастомный keymap, который блокирует встроенные undo/redo
        // и оставляет только наши кастомные обработчики
        const customKeymap = keymap({
          'Mod-z': () => {
            // Блокируем встроенный undo - наш обработчик в NoteViewer перехватит
            return true; // true = команда обработана, не передавать дальше
          },
          'Mod-y': () => {
            // Блокируем встроенный redo
            return true;
          },
          'Mod-Shift-z': () => {
            // Блокируем встроенный redo (Shift+Z)
            return true;
          },
        });

        // Создаем плагины для drag-and-drop (только если не readOnly)
        const newPlugins = [
          ...plugins.filter(p => {
            // Удаляем встроенные undo/redo keymap, если они есть
            const pluginKey = (p as any).key;
            return pluginKey !== 'undo' && pluginKey !== 'redo';
          }),
          customKeymap,
        ];

        if (!effectiveReadOnly) {
          const gapCursorPlugin = gapCursor();
          const dropCursorPlugin = dropCursor();
          newPlugins.push(gapCursorPlugin, dropCursorPlugin);
        }

        const newState = EditorState.create({
          doc: state.doc,
          plugins: newPlugins,
          schema: state.schema,
        });

        // Обновляем view с новым состоянием
        view.updateState(newState);
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error configuring plugins:', error);
    }
  }, [loading, effectiveReadOnly]);


  const updateYText = useCallback(
    (markdown: string) => {
      const text = yTextRef.current;
      if (!text || effectiveReadOnly) return;
      const doc = text.doc;
      if (!doc) return;

      const previous = lastMarkdownRef.current ?? '';
      if (markdown === previous) {
        return;
      }

      const next = markdown ?? '';
      let start = 0;
      const prevLength = previous.length;
      const nextLength = next.length;

      while (start < prevLength && start < nextLength && previous[start] === next[start]) {
        start += 1;
      }

      let endPrev = prevLength;
      let endNext = nextLength;
      while (endPrev > start && endNext > start && previous[endPrev - 1] === next[endNext - 1]) {
        endPrev -= 1;
        endNext -= 1;
      }

      const deleteCount = endPrev - start;
      const insertText = next.slice(start, endNext);

      doc.transact(() => {
        if (deleteCount > 0) {
          text.delete(start, deleteCount);
        }
        if (insertText.length > 0) {
          text.insert(start, insertText);
        }
      }, 'milkdown');

      lastMarkdownRef.current = next;
    },
    [effectiveReadOnly]
  );

  const applyMarkdownToEditor = useCallback((markdown: string, preserveSelection: boolean = false) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    try {
      editor.action((ctx: Ctx) => {
      const parser = ctx.get(parserCtx);
      const view = ctx.get(editorViewCtx);
        if (!parser || !view) return;
        
        // Сохраняем текущий selection и фокус
        // Всегда сохраняем, если редактор в фокусе (особенно важно для preview режима)
        let savedSelection: { from: number; to: number } | null = null;
        let hadFocus = false;
        const isFocused = view.hasFocus() || document.activeElement === view.dom;
        
        if (preserveSelection || isFocused) {
          hadFocus = isFocused;
          if (isFocused) {
            const { from, to } = view.state.selection;
            savedSelection = { from, to };
          }
        }
        
      const doc = parser(markdown);
      if (!doc) return;
        
        // Создаём новое состояние
        let newState = EditorState.create({
        schema: view.state.schema,
        doc,
        plugins: view.state.plugins
      });
        
        // Обновляем состояние
        view.updateState(newState);
        
        // Восстанавливаем selection после обновления состояния
        if ((preserveSelection || hadFocus) && savedSelection) {
          // Используем requestAnimationFrame для надежного восстановления
          requestAnimationFrame(() => {
            if (!savedSelection) return;
            try {
              const { from, to } = savedSelection;
              const maxPos = view.state.doc.content.size;
              const validFrom = Math.min(from, maxPos);
              const validTo = Math.min(to, maxPos);
              
              if (validFrom >= 0 && validTo >= validFrom) {
                const { TextSelection } = require('prosemirror-state');
                const selection = TextSelection.create(view.state.doc, validFrom, validTo);
                const tr = view.state.tr.setSelection(selection);
                view.dispatch(tr);
              } else if (maxPos > 0) {
                // Если позиции невалидны, ставим каретку в конец
                const endPos = maxPos;
                const { TextSelection } = require('prosemirror-state');
                const selection = TextSelection.create(view.state.doc, endPos);
                const tr = view.state.tr.setSelection(selection);
                view.dispatch(tr);
              }
            } catch (e) {
              // Игнорируем ошибки восстановления selection
            }
          });
        }
        
        // Восстанавливаем фокус, если он был
        if ((preserveSelection || (hadFocus && !effectiveReadOnly)) && hadFocus) {
          requestAnimationFrame(() => {
            if (view.dom && document.activeElement !== view.dom) {
              view.focus();
            }
          });
        }
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error applying markdown:', error);
    }
  }, [effectiveReadOnly]);

  // Set up shared connection immediately if provided (before editor initialization)
  useEffect(() => {
    if (sharedConnection) {
      yTextRef.current = sharedConnection.text;
      const initialMarkdown = sharedConnection.text.toString();
      lastMarkdownRef.current = initialMarkdown;
      
      // If editor is already ready, apply initial state immediately
      if (editorRef.current && readOnly && initialMarkdown) {
        setTimeout(() => {
          if (editorRef.current && yTextRef.current) {
            const markdown = yTextRef.current.toString();
            if (markdown && markdown !== lastMarkdownRef.current) {
              applyingRemoteRef.current = true;
              onContentChange?.(markdown, { origin: 'sync' });
              applyMarkdownToEditor(markdown);
              lastMarkdownRef.current = markdown;
              applyingRemoteRef.current = false;
            }
          }
        }, 100);
      }
    }
  }, [sharedConnection, readOnly, onContentChange, applyMarkdownToEditor]);

  const computeReadOnlyState = useCallback(
    () => (expectSharedConnection ? false : readOnly),
    [expectSharedConnection, readOnly]
  );

  const applyReadOnlyState = useCallback((readonlyFlag: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      editor.action((ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const editable = !readonlyFlag;
        view.setProps({
          ...view.props,
          editable: () => editable,
        });

        view.dom.contentEditable = editable ? 'true' : 'false';
        view.dom.setAttribute('contenteditable', editable ? 'true' : 'false');
        view.dom.style.userSelect = 'text';
        (view.dom.style as any).webkitUserSelect = 'text';
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error toggling readOnly mode:', error);
    }
  }, []);

  // Сохраняем ссылку на редактор после инициализации и применяем начальное состояние для readOnly
  useEffect(() => {
    if (loading) return;
    try {
      const editor = get();
      if (editor) {
        editorRef.current = editor;
        setIsEditorReady(true);
        applyReadOnlyState(computeReadOnlyState());
        
        // Для readOnly редакторов применяем состояние после инициализации
        const applyInitialForReadOnly = () => {
          if (readOnly && yTextRef.current) {
            const markdown = yTextRef.current.toString();
            if (markdown && markdown !== lastMarkdownRef.current) {
              applyingRemoteRef.current = true;
              onContentChange?.(markdown, { origin: 'sync' });
              applyMarkdownToEditor(markdown);
              lastMarkdownRef.current = markdown;
              applyingRemoteRef.current = false;
            }
          }
        };

        // Применяем начальное состояние
        if (readOnly) {
          // Если есть shared connection, применяем быстрее
          if (sharedConnection && yTextRef.current) {
            setTimeout(applyInitialForReadOnly, 50);
          } else {
            setTimeout(applyInitialForReadOnly, 300);
          }
        }
        
      }
    } catch (error) {
      console.error('[MilkdownEditor] Error getting editor:', error);
      setError('Ошибка инициализации редактора');
    }
  }, [
    get,
    loading,
    readOnly,
    applyMarkdownToEditor,
    onContentChange,
    sharedConnection,
    applyReadOnlyState,
    computeReadOnlyState,
  ]);

  useEffect(() => {
    if (!isEditorReady) return;
    const shouldBeReadOnly = computeReadOnlyState();
    applyReadOnlyState(shouldBeReadOnly);
  }, [isEditorReady, computeReadOnlyState, applyReadOnlyState]);

  // В split-preview режиме перехватываем undo/redo и направляем наружу,
  // чтобы можно было делать Ctrl+Z/Y прямо из превью
  useEffect(() => {
    if (!expectSharedConnection) return;
    if (!isEditorReady) return;
    if (!onUndo && !onRedo) return;

    const editor = editorRef.current;
    if (!editor) return;

    let cleanup: (() => void) | undefined;

    try {
      editor.action((ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const handler = (event: KeyboardEvent) => {
          const isMod = event.ctrlKey || event.metaKey;
          if (!isMod) return;
          const key = event.key.toLowerCase();

          if (key === 'z') {
            if (event.shiftKey) {
              if (onRedo) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation?.();
                onRedo();
              }
            } else if (onUndo) {
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation?.();
              onUndo();
            }
          } else if (key === 'y' && onRedo) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            onRedo();
          }
        };

        view.dom.addEventListener('keydown', handler, true);
        cleanup = () => {
          view.dom.removeEventListener('keydown', handler, true);
        };
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error binding preview undo handlers:', error);
    }

    return () => {
      cleanup?.();
    };
  }, [expectSharedConnection, isEditorReady, onUndo, onRedo]);

  // Принудительное применение контента по сигналу извне (undo/redo из textarea)

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      editor.action((ctx: Ctx) => {
      const manager = ctx.get(listenerCtx as any) as any;
        if (!manager) return;
      manager.markdownUpdated((_ctx: unknown, markdown: string) => {
        if (applyingRemoteRef.current) return;
          onContentChange?.(markdown, { origin: 'milkdown' });
        updateYText(markdown);
      });
    });
    } catch (error) {
      console.error('[MilkdownEditor] Error setting up listener:', error);
    }
  }, [onContentChange, updateYText]);

  useEffect(() => {
    if (loading) return;
    const editor = editorRef.current;
    if (!editor) return;

    // If sharedConnection is expected but not yet available, wait for it
    // (This happens when NoteViewer creates connection asynchronously)
    if (readOnly && expectSharedConnection && !sharedConnection && connectionRef.current === null) {
      return; // Wait for sharedConnection to become available
    }

    let isMounted = true;
    setError(null);

    // Use shared connection if provided, otherwise create a new one
    let connection: ConnectionType | null = null;
    let provider: any;
    let text: any;
    let shouldDestroyConnection = false;

    if (sharedConnection) {
      // Use shared connection
      provider = sharedConnection.provider;
      text = sharedConnection.text;
      // Create a minimal connection object for compatibility
      connection = {
        doc: sharedConnection.doc,
        provider,
        text,
        destroy: () => {
          // Don't destroy shared connection, just clean up observers
          if (yTextRef.current && observerRef.current) {
            yTextRef.current.unobserve(observerRef.current);
          }
        }
      } as ConnectionType;
      connectionRef.current = connection;
      yTextRef.current = text;
    } else {
      // Create new connection
      const token = getToken ? getToken() : localStorage.getItem('token');
      if (!token && !readOnly) {
        setError('Token is required for editing');
        return;
      }

      connection = createNoteConnection({
      noteId,
        token: token || '',
      wsUrl: process.env.REACT_APP_WS_URL || 'ws://localhost:5000'
    }) as ConnectionType;

    connectionRef.current = connection;
      provider = connection.provider;
      text = connection.text;
    yTextRef.current = text;
      shouldDestroyConnection = true;
    }

    const applyFromYjs = (force = false, preserveSelection: boolean = false) => {
      if (!isMounted || !yTextRef.current || !editorRef.current) return;

      const markdown = yTextRef.current.toString();
      
      // Всегда проверяем, изменилось ли содержимое
      if (!force && markdown === lastMarkdownRef.current) {
        return;
      }
      
      // Предотвращаем повторное применение, если уже применяем
      if (applyingRemoteRef.current && !force) {
        return;
      }
      
      applyingRemoteRef.current = true;
      onContentChange?.(markdown, { origin: 'sync' });
      applyMarkdownToEditor(markdown, preserveSelection);
      lastMarkdownRef.current = markdown;
      applyingRemoteRef.current = false;
    };

    // Слушаем изменения в Y.Text
    // Важно: игнорируем транзакции с origin === 'milkdown',
    // т.к. это наши собственные локальные правки (чтобы не перезатирать фокус).
    const observer = (...args: any[]) => {
      const event = args[0];
      const origin = event?.transaction?.origin;
      if (origin === 'milkdown') {
        return;
      }
      if (!applyingRemoteRef.current) {
        // Проверяем, активен ли редактор (пользователь может печатать)
        const editor = editorRef.current;
        let isEditorFocused = false;
        if (editor) {
          try {
            editor.action((ctx: Ctx) => {
              const view = ctx.get(editorViewCtx);
              if (view) {
                isEditorFocused = view.hasFocus() || document.activeElement === view.dom;
              }
            });
          } catch (e) {
            // Игнорируем ошибки
          }
        }
        // Сохраняем selection для undo-redo, для preview режима (readOnly),
        // и когда редактор в фокусе (пользователь печатает)
        const shouldPreserve = origin === 'undo-redo' || (readOnly && expectSharedConnection) || isEditorFocused;
        applyFromYjs(false, shouldPreserve);
      }
    };
    const initialMarkdown = text.toString();
    lastMarkdownRef.current = initialMarkdown;
    text.observe(observer);
    observerRef.current = observer;

    // Функция для применения начального состояния с проверкой готовности редактора
    const applyInitialState = () => {
      if (!editorRef.current || !yTextRef.current) {
        // Если редактор еще не готов, пробуем еще раз
        setTimeout(applyInitialState, 200);
        return;
      }
      
      const markdown = yTextRef.current.toString();
      // Всегда применяем начальное состояние, даже если оно совпадает с lastMarkdownRef
      // Это гарантирует, что содержимое отобразится при первом рендере или после переключения режима
      applyFromYjs(true); // force = true для начального состояния
    };

    // Применяем начальное значение
    // Для shared connection применяем сразу, для нового connection ждем синхронизации
    if (sharedConnection) {
      applyInitialState();
      setTimeout(applyInitialState, 100);
      setTimeout(applyInitialState, 300);
    } else {
      // Ждем синхронизации с сервером перед применением начального состояния
      const waitForSync = () => {
        if (!provider || typeof provider.on !== 'function') {
          // Если нет провайдера, применяем сразу
          applyInitialState();
          return;
        }

        const handleSync = (isSynced: boolean) => {
          if (isSynced) {
            applyInitialState();
            // Удаляем обработчик после первого успешного применения
            provider.off('sync', handleSync);
            provider.off('synced', handleSync);
          }
        };

        provider.on('sync', handleSync);
        provider.on('synced', handleSync);

        // Также применяем сразу, если редактор готов (на случай, если синхронизация уже произошла)
        applyInitialState();
        
        // И пробуем еще несколько раз с задержкой для надежности
        setTimeout(applyInitialState, 200);
        setTimeout(applyInitialState, 500);
        setTimeout(applyInitialState, 1000);
        setTimeout(applyInitialState, 2000);
      };

      waitForSync();
    }

    // Также применяем после подключения и синхронизации, чтобы получить состояние с сервера
    if (provider && typeof provider.on === 'function') {
      const handleStatus = (event: { status: string }) => {
        if (!isMounted) return;
        setIsConnected(event.status === 'connected');
        if (event.status === 'connected') {
          setError(null);
          // Применяем состояние после подключения, но только если редактор готов
          setTimeout(() => {
            if (isMounted && editorRef.current) {
              applyFromYjs();
            }
          }, 800);
        }
      };

      const handleSync = (isSynced: boolean) => {
        if (!isMounted || !editorRef.current) return;
        if (isSynced) {
          // Применяем только один раз после синхронизации
          setTimeout(() => {
            if (isMounted && editorRef.current) {
              applyFromYjs();
            }
          }, 300);
        }
      };

      provider.on('status', handleStatus);
      provider.on('sync', handleSync);
      provider.on('synced', handleSync);

      provider.on('connection-error', (err: Error) => {
        if (!isMounted) return;
        setError(err.message);
        setIsConnected(false);
      });
      
      // Проверяем синхронизацию реже и только если редактор готов
      const syncCheckInterval = setInterval(() => {
        if (!isMounted || !editorRef.current) {
          return;
        }
        const syncedValue = (provider as any).synced;
        if (syncedValue) {
          const currentMarkdown = yTextRef.current?.toString() || '';
          if (currentMarkdown !== lastMarkdownRef.current) {
            applyFromYjs();
          }
        }
      }, 2000); // Увеличил интервал до 2 секунд
      
      return () => {
        isMounted = false;
        clearInterval(syncCheckInterval);
        if (provider && typeof provider.off === 'function') {
          provider.off('status', handleStatus);
          provider.off('sync', handleSync);
          provider.off('synced', handleSync);
          provider.off('connection-error');
        }
        if (yTextRef.current && observerRef.current) {
          yTextRef.current.unobserve(observerRef.current);
        }
        observerRef.current = null;
        yTextRef.current = null;

        if (connectionRef.current && shouldDestroyConnection) {
          connectionRef.current.destroy();
          connectionRef.current = null;
        }
      };
    } else {
      return () => {
        isMounted = false;
        if (yTextRef.current && observerRef.current) {
          yTextRef.current.unobserve(observerRef.current);
        }
        observerRef.current = null;
        yTextRef.current = null;

        if (connectionRef.current && shouldDestroyConnection) {
          connectionRef.current.destroy();
          connectionRef.current = null;
        }
      };
    }
  }, [noteId, loading, applyMarkdownToEditor, onContentChange, getToken, readOnly, sharedConnection]);

  // Дополнительный readOnly‑эффект был удалён, чтобы не конфликтовать с effectiveReadOnly

  // Управление индикатором загрузки
  useEffect(() => {
    if (!loading) {
      setShowLoadingIndicator(false);
    } else {
      // Скрываем индикатор через 2 секунды, даже если loading еще true
      const timeout = setTimeout(() => {
        setShowLoadingIndicator(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  // Очистка кастомных провайдеров больше не требуется

  if (error) {
    return (
      <div className={styles.errorState}>
        <strong>Ошибка подключения к Yjs:</strong>
        <div>{error}</div>
      </div>
    );
  }

  return (
    <div className={cx(styles.wrapper, className)}>
      {showLoadingIndicator && loading && (
        <div className={styles.loadingOverlay}>
          <p>Загрузка редактора...</p>
        </div>
      )}
      {/* <div
        className={cx(
          styles.statusBadge,
          isConnected ? styles.statusConnected : styles.statusDisconnected
        )}
      >
        {isConnected ? 'Подключено' : 'Отключено'}
      </div> */}
      <div
        ref={containerRef}
        className={cx(
          readOnly ? 'milkdown-readonly-container' : 'milkdown-editor-container',
          styles.editorContainer
        )}
      >
        <Milkdown />
      </div>
    </div>
  );
};

// Внешний компонент, который оборачивает внутренний в MilkdownProvider
export const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
};
