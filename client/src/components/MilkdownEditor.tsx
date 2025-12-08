import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Editor, defaultValueCtx, editorViewCtx, parserCtx, rootCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { slashFactory } from '@milkdown/plugin-slash';
import { tooltipFactory } from '@milkdown/plugin-tooltip';
import { Ctx } from '@milkdown/ctx';
import { EditorState, Transaction } from 'prosemirror-state';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';
import { keymap } from 'prosemirror-keymap';
import { ySyncPlugin } from 'y-prosemirror';
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
  initialMarkdown?: string; // Предзагрузка текста до синка Yjs, чтобы убрать моргание
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
  initialMarkdown,
  sharedConnection,
  expectSharedConnection = false,
  onUndo,
  onRedo
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [yTextKey, setYTextKey] = useState<any>(null);

  const connectionRef = useRef<ConnectionType | null>(null);
  const yTextRef = useRef<any>(null);
  const observerRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<any>(null);
  const applyingRemoteRef = useRef(false);
  const lastMarkdownRef = useRef('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isUserTypingRef = useRef(false);
  const savedScrollTopRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const scrollRestoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringScrollRef = useRef(false);

  const { get, loading } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialMarkdown || '');
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

  // Настройка плагинов ProseMirror: добавляем ySyncPlugin (привязка к Y.Text),
  // отключаем встроенные undo/redo keymap (используем свои), включаем gap/drop cursor
  useEffect(() => {
    if (loading) return;
    const editor = editorRef.current;
    if (!editor || !yTextKey || !yTextRef.current) return;

    try {
      editor.action((ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const state = view.state;
        const plugins = state.plugins;

        // Блокируем встроенные undo/redo (обрабатываются выше в NoteViewer)
        const customKeymap = keymap({
          'Mod-z': () => true,
          'Mod-y': () => true,
          'Mod-Shift-z': () => true,
        });

        const newPlugins = [
          // y-prosemirror синхронизирует содержимое напрямую с Y.Text
          ySyncPlugin(yTextRef.current),
          ...plugins.filter(p => {
            const pluginKey = (p as any).key;
            return pluginKey !== 'undo' && pluginKey !== 'redo';
          }),
          customKeymap,
        ];

        if (!effectiveReadOnly) {
          newPlugins.push(gapCursor(), dropCursor());
        }

        const newState = EditorState.create({
          doc: state.doc,
          plugins: newPlugins,
          schema: state.schema,
        });

        view.updateState(newState);
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error configuring plugins:', error);
    }
  }, [loading, effectiveReadOnly, yTextKey]);


  // ySyncPlugin сам обновляет Y.Text, ручной патчинг не нужен
  const updateYText = useCallback((_markdown?: string) => {}, []);

  const applyMarkdownToEditor = useCallback((markdown: string, preserveSelection: boolean = false) => {
    // Применяем markdown к редактору
    
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    
    try {
      editor.action((ctx: Ctx) => {
      const parser = ctx.get(parserCtx);
      const view = ctx.get(editorViewCtx);
        if (!parser || !view) {
          console.warn('[MilkdownEditor] [DEBUG] No parser or view!');
          return;
        }
        
        // В readOnly режиме сохраняем позицию скролла и восстанавливаем её после обновления
        // Это предотвращает сброс скролла в начало при обновлении preview
        if (effectiveReadOnly) {
          console.log('[MilkdownEditor] [DEBUG] applyMarkdownToEditor called in readOnly mode, markdown length:', markdown.length);
          console.log('[MilkdownEditor] [DEBUG] view.dom:', view.dom, 'view.dom.parentElement:', view.dom.parentElement);
          
          // Находим скроллируемый контейнер - это может быть .previewScroll (внешний) или .editorContainer (внутренний)
          // Ищем все возможные скроллируемые контейнеры и выбираем тот, который действительно скроллится
          let scrollContainer: HTMLElement | null = null;
          
          // Сначала ищем .previewScroll (контейнер из NoteViewer)
          const previewScroll = view.dom.closest('.previewScroll') as HTMLElement;
          if (previewScroll) {
            scrollContainer = previewScroll;
            console.log('[MilkdownEditor] [DEBUG] Found .previewScroll container');
          } else {
            // Если не нашли, ищем .editorContainer (внутренний контейнер редактора)
            const editorContainer = view.dom.closest('.editorContainer') as HTMLElement;
            if (editorContainer) {
              scrollContainer = editorContainer;
              console.log('[MilkdownEditor] [DEBUG] Found .editorContainer');
            } else {
              // Если не нашли, ищем любой родительский элемент с overflow
              let parent = view.dom.parentElement;
              while (parent && parent !== document.body) {
                const style = window.getComputedStyle(parent);
                if (style.overflow === 'auto' || style.overflow === 'scroll' || 
                    style.overflowY === 'auto' || style.overflowY === 'scroll') {
                  scrollContainer = parent;
                  console.log('[MilkdownEditor] [DEBUG] Found parent with overflow:', parent.className);
                  break;
                }
                parent = parent.parentElement;
              }
            }
          }
          
          // Сохраняем найденный контейнер в ref
          if (scrollContainer && !scrollContainerRef.current) {
            scrollContainerRef.current = scrollContainer;
            console.log('[MilkdownEditor] [DEBUG] Saved scroll container to ref');
          } else if (scrollContainer) {
            scrollContainerRef.current = scrollContainer;
          }
          
          // Сохраняем текущую позицию СКРОЛЛА (не каретки!) перед обновлением
          // В readOnly режиме нет каретки, только скролл контейнера
          if (scrollContainerRef.current) {
            savedScrollTopRef.current = scrollContainerRef.current.scrollTop;
            console.log('[MilkdownEditor] [DEBUG] ✅ Saved SCROLL position (not caret!):', savedScrollTopRef.current, 'px');
            console.log('[MilkdownEditor] [DEBUG] Container:', scrollContainerRef.current.className, 'scrollHeight:', scrollContainerRef.current.scrollHeight, 'clientHeight:', scrollContainerRef.current.clientHeight);
          } else {
            console.warn('[MilkdownEditor] [DEBUG] ❌ No scroll container found! Cannot save scroll position.');
          }
          
          const doc = parser(markdown);
          if (!doc) {
            console.warn('[MilkdownEditor] [DEBUG] Parser returned null');
            return;
          }
          
          console.log('[MilkdownEditor] [DEBUG] Before update - scrollTop:', scrollContainerRef.current?.scrollTop, 'saved:', savedScrollTopRef.current);
          
          // Используем transaction для обновления документа вместо полного пересоздания состояния
          // Это помогает сохранить скролл, т.к. не пересоздается весь DOM
          try {
            const tr = view.state.tr;
            // Заменяем весь контент документа новым
            tr.replaceWith(0, view.state.doc.content.size, doc.content);
            tr.setMeta('addToHistory', false); // Не добавляем в историю для readOnly обновлений
            tr.setMeta('preserveScroll', true); // Флаг для сохранения скролла
            
            console.log('[MilkdownEditor] [DEBUG] Dispatching transaction, old doc size:', view.state.doc.content.size, 'new doc size:', doc.content.size);
            
            // Применяем transaction
            view.dispatch(tr);
            
            console.log('[MilkdownEditor] [DEBUG] After dispatch - scrollTop:', scrollContainerRef.current?.scrollTop);
          } catch (e) {
            // Если transaction не сработал, используем старый способ
            console.warn('[MilkdownEditor] [DEBUG] Transaction failed, using updateState:', e);
            let newState = EditorState.create({
              schema: view.state.schema,
              doc,
              plugins: view.state.plugins
            });
            view.updateState(newState);
            console.log('[MilkdownEditor] [DEBUG] After updateState - scrollTop:', scrollContainerRef.current?.scrollTop);
          }
          
          // Восстанавливаем позицию СКРОЛЛА (не каретки!) после обновления
          // Используем несколько попыток с разными задержками для надежности
          if (scrollContainerRef.current && savedScrollTopRef.current >= 0) {
            console.log('[MilkdownEditor] [DEBUG] 🔄 Starting SCROLL restoration (not caret!), saved position:', savedScrollTopRef.current, 'px');
            
            // Очищаем предыдущий timeout, если он есть
            if (scrollRestoreTimeoutRef.current) {
              clearTimeout(scrollRestoreTimeoutRef.current);
            }
            
            isRestoringScrollRef.current = true;
            
            // Функция для восстановления СКРОЛЛА (не каретки!)
            const restoreScroll = (attempt: number) => {
              if (scrollContainerRef.current && savedScrollTopRef.current >= 0) {
                const before = scrollContainerRef.current.scrollTop;
                scrollContainerRef.current.scrollTop = savedScrollTopRef.current;
                const after = scrollContainerRef.current.scrollTop;
                const success = Math.abs(after - savedScrollTopRef.current) < 5; // Допускаем погрешность 5px
                console.log(`[MilkdownEditor] [DEBUG] 🔄 Scroll restore attempt ${attempt}: before=${before}px, after=${after}px, target=${savedScrollTopRef.current}px, success=${success}`);
                if (!success && attempt === 4) {
                  console.error('[MilkdownEditor] [DEBUG] ❌ FAILED to restore scroll after all attempts!');
                }
              } else {
                console.warn(`[MilkdownEditor] [DEBUG] Cannot restore scroll attempt ${attempt}: container=${!!scrollContainerRef.current}, saved=${savedScrollTopRef.current}`);
              }
            };
            
            // Пробуем восстановить несколько раз, т.к. DOM может обновляться асинхронно
            // Используем requestAnimationFrame для синхронизации с рендером
            requestAnimationFrame(() => {
              restoreScroll(1);
              // Дополнительные попытки с небольшими задержками
              setTimeout(() => restoreScroll(2), 0);
              setTimeout(() => restoreScroll(3), 10);
              setTimeout(() => {
                restoreScroll(4);
                isRestoringScrollRef.current = false;
                console.log('[MilkdownEditor] [DEBUG] Finished scroll restoration attempts');
              }, 50);
            });
          } else {
            console.warn('[MilkdownEditor] [DEBUG] Cannot restore scroll - no container or saved position is 0, container:', scrollContainerRef.current, 'saved:', savedScrollTopRef.current);
          }
          console.log('[MilkdownEditor] [DEBUG] ===== applyMarkdownToEditor END (readOnly) =====');
          return;
        }
        
        // Для редактируемого режима ВСЕГДА сохраняем selection, даже если в момент вызова редактор не в фокусе
        // Это критично для предотвращения сброса каретки, т.к. вызовы могут приходить асинхронно
        const isFocused = view.hasFocus() || document.activeElement === view.dom;
        let savedSelection: { from: number; to: number } | null = null;
        let hadFocus = false;
        
        // Сохраняем selection если редактор в фокусе ИЛИ если явно запрошено сохранение
        if (isFocused || preserveSelection) {
          hadFocus = isFocused;
          if (view.state.selection) {
            const { from, to } = view.state.selection;
            savedSelection = { from, to };
          }
        }
        
        const doc = parser(markdown);
        if (!doc) return;
        
        // Используем transaction вместо updateState для более точного контроля
        // Это позволяет сохранить selection лучше
        try {
          const tr = view.state.tr;
          tr.replaceWith(0, view.state.doc.content.size, doc.content);
          tr.setMeta('addToHistory', false);
          
          // Если нужно сохранить selection, пытаемся восстановить её в transaction
          if (savedSelection && (preserveSelection || hadFocus)) {
            const maxPos = tr.doc.content.size;
            const validFrom = Math.min(savedSelection.from, maxPos);
            const validTo = Math.min(savedSelection.to, maxPos);
            
            if (validFrom >= 0 && validTo >= validFrom) {
              const { TextSelection } = require('prosemirror-state');
              const selection = TextSelection.create(tr.doc, validFrom, validTo);
              tr.setSelection(selection);
            }
          }
          
          view.dispatch(tr);
        } catch (e) {
          // Fallback на updateState если transaction не сработал
          const newState = EditorState.create({
            schema: view.state.schema,
            doc,
            plugins: view.state.plugins
          });
          view.updateState(newState);
        }
        
        // Дополнительное восстановление selection через requestAnimationFrame для надежности
        if (savedSelection && (preserveSelection || hadFocus)) {
          requestAnimationFrame(() => {
            try {
              const maxPos = view.state.doc.content.size;
              const validFrom = Math.min(savedSelection!.from, maxPos);
              const validTo = Math.min(savedSelection!.to, maxPos);
              
              if (validFrom >= 0 && validTo >= validFrom) {
                const { TextSelection } = require('prosemirror-state');
                const selection = TextSelection.create(view.state.doc, validFrom, validTo);
                const tr = view.state.tr.setSelection(selection);
                view.dispatch(tr);
              }
            } catch (e) {
              // Игнорируем ошибки
            }
          });
        }
        
        // Восстанавливаем фокус, если он был
        if (hadFocus) {
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
    }
  }, [sharedConnection]);

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

  // Сохраняем ссылку на редактор после инициализации
  useEffect(() => {
    if (loading) return;
    try {
      const editor = get();
      if (editor) {
        editorRef.current = editor;
        setIsEditorReady(true);
        applyReadOnlyState(computeReadOnlyState());
      }
    } catch (error) {
      console.error('[MilkdownEditor] Error getting editor:', error);
      setError('Ошибка инициализации редактора');
    }
  }, [
    get,
    loading,
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
      setYTextKey(text);
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
      setYTextKey(text);
      shouldDestroyConnection = true;
    }

    // Если Y.Text пуст и есть initialMarkdown, запишем его один раз.
    if (initialMarkdown && yTextRef.current && yTextRef.current.length === 0) {
      try {
        yTextRef.current.insert(0, initialMarkdown);
        lastMarkdownRef.current = initialMarkdown;
      } catch (e) {
        console.error('[MilkdownEditor] Failed to set initialMarkdown into Y.Text', e);
      }
    }

    // ySyncPlugin синхронизирует содержимое автоматически, ручное применение не нужно
    const applyFromYjs = () => {};

    // ySyncPlugin сам обновляет ProseMirror, observer не нужен
    const initialMarkdownFromYjs = text.toString();
    
    // Если есть initialMarkdown из пропсов и в Y.Text пока пусто — запишем его сразу,
    // чтобы не было пустого состояния до синка (убирает моргание).
    if (initialMarkdown && initialMarkdownFromYjs.length === 0) {
      try {
        text.insert(0, initialMarkdown);
        lastMarkdownRef.current = initialMarkdown;
      } catch (e) {
        console.error('[MilkdownEditor] Failed to apply initialMarkdown to Y.Text', e);
        lastMarkdownRef.current = initialMarkdownFromYjs;
      }
    } else {
      lastMarkdownRef.current = initialMarkdownFromYjs;
    }
    
    observerRef.current = null;

    // Начальное состояние отображается напрямую через ySyncPlugin, доп. применение не требуется
    const applyInitialState = () => {};

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
        
        // Применяем с задержкой только один раз, если синхронизация затянется
        setTimeout(() => {
          if (isMounted && editorRef.current) {
            applyInitialState();
          }
        }, 1000);
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

      // ySyncPlugin сам обновляет контент, дополнительные sync‑обработчики не нужны
      const handleSync = () => {};

      provider.on('status', handleStatus);
      provider.on('sync', handleSync);
      provider.on('synced', handleSync);

      provider.on('connection-error', (err: Error) => {
        if (!isMounted) return;
        setError(err.message);
        setIsConnected(false);
      });
      
      // Проверяем синхронизацию реже и только если редактор готов
      // УБРАНО: этот интервал вызывал лишние перерендеры
      // Синхронизация уже обрабатывается через события 'sync' и 'synced'
      
      return () => {
        isMounted = false;
        if (provider && typeof provider.off === 'function') {
          provider.off('status', handleStatus);
          provider.off('sync', handleSync);
          provider.off('synced', handleSync);
          provider.off('connection-error');
        }
        if (updateDebounceTimeoutRef.current) {
          clearTimeout(updateDebounceTimeoutRef.current);
          updateDebounceTimeoutRef.current = null;
        }
        if (scrollRestoreTimeoutRef.current) {
          clearTimeout(scrollRestoreTimeoutRef.current);
          scrollRestoreTimeoutRef.current = null;
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
        if (updateDebounceTimeoutRef.current) {
          clearTimeout(updateDebounceTimeoutRef.current);
          updateDebounceTimeoutRef.current = null;
        }
        if (scrollRestoreTimeoutRef.current) {
          clearTimeout(scrollRestoreTimeoutRef.current);
          scrollRestoreTimeoutRef.current = null;
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
    }
  }, [noteId, loading, applyMarkdownToEditor, onContentChange, getToken, readOnly, sharedConnection, initialMarkdown, expectSharedConnection]);

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
