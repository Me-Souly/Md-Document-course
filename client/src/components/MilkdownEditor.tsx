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
import { ySyncPlugin } from 'y-prosemirror';
import { createNoteConnection } from '../yjs/yjs-connector.js';
import styles from './MilkdownEditor.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');
const logRender = (...args: any[]) => {
  // Centralized debug logger for render/sync flow
  console.log('[MilkdownRender]', ...args);
};

const findScrollContainer = (node: HTMLElement | null): HTMLElement | null => {
  if (!node) return null;
  const preview = node.closest('.previewScroll') as HTMLElement | null;
  if (preview) return preview;
  const editorContainer = node.closest('.editorContainer') as HTMLElement | null;
  if (editorContainer) return editorContainer;
  let parent = node.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflow === 'auto' ||
      style.overflow === 'scroll' ||
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll'
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

type MilkdownEditorProps = {
  noteId: string;
  readOnly?: boolean;
  placeholder?: string;
  onContentChange?: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
  className?: string;
  getToken?: () => string | null;
  initialMarkdown?: string;
  sharedConnection?: {
    doc: any;
    provider: any;
    text: any;
    fragment: any;
  };
  expectSharedConnection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

type ConnectionType = {
  doc: any;
  provider: any;
  text: any;
  fragment: any;
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

  const connectionRef = useRef<ConnectionType | null>(null);
  const yTextRef = useRef<any>(null);
  const yFragmentRef = useRef<any>(null);
  const observerRef = useRef<((event: any) => void) | null>(null);
  const editorRef = useRef<any>(null);
  const applyingRemoteRef = useRef(false);
  const initialApplyDoneRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Настройка плагинов ProseMirror: добавляем ySyncPlugin (привязка к Y.XmlFragment),
  // отключаем встроенные undo/redo keymap (используем свои), включаем gap/drop cursor
  useEffect(() => {
    if (loading) return;
    const editor = editorRef.current;
    if (!editor || !yFragmentRef.current) return;

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
          // y-prosemirror синхронизирует содержимое напрямую с Y.XmlFragment
          ySyncPlugin(yFragmentRef.current),
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
  }, [loading, effectiveReadOnly]);


  // Запись markdown в Y.Text с диффом (нужно для textarea/undo и как источник markdown)
  // Запись markdown в Y.Text (дифф)
  const updateYText = useCallback((markdown: string, origin: string = 'milkdown') => {
    const text = yTextRef.current;
    if (!text) return;
    const doc = text.doc;
    if (!doc) return;

    const previous = text.toString();
    if (markdown === previous) return;

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
    }, origin);
  }, []);

  const applyMarkdownToEditor = useCallback(
    (markdown: string, { preserveSelection = false, addToHistory = false }: { preserveSelection?: boolean; addToHistory?: boolean } = {}) => {
      const editor = editorRef.current;
      if (!editor) return;

      logRender('applyMarkdownToEditor start', {
        length: markdown.length,
        preserveSelection,
        addToHistory,
      });

      editor.action((ctx: Ctx) => {
        const parser = ctx.get(parserCtx);
        const view = ctx.get(editorViewCtx);
        if (!parser || !view) {
          logRender('applyMarkdownToEditor abort: no parser/view');
          return;
        }

        const doc = parser(markdown);
        if (!doc) {
          logRender('applyMarkdownToEditor abort: parser returned null');
          return;
        }

        // Preserve scroll in read-only preview mode to avoid jump on re-render
        let savedScrollTop: number | null = null;
        let scrollContainer: HTMLElement | null = null;
        if (effectiveReadOnly) {
          scrollContainer = findScrollContainer(view.dom as HTMLElement);
          if (scrollContainer) {
            savedScrollTop = scrollContainer.scrollTop;
            logRender('applyMarkdownToEditor save scroll', {
              top: savedScrollTop,
              height: scrollContainer.scrollHeight,
            });
          }
        }

        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
        tr.setMeta('addToHistory', addToHistory);

        if (preserveSelection) {
          const { from, to } = view.state.selection;
          const maxPos = tr.doc.content.size;
          const validFrom = Math.min(from, maxPos);
          const validTo = Math.min(to, maxPos);
          const { TextSelection } = require('prosemirror-state');
          tr.setSelection(TextSelection.create(tr.doc, validFrom, validTo));
        }

        view.dispatch(tr);
        logRender('applyMarkdownToEditor dispatched', {
          docSize: tr.doc.content.size,
          selectionPreserved: preserveSelection,
        });

        if (effectiveReadOnly && scrollContainer && savedScrollTop !== null) {
          requestAnimationFrame(() => {
            scrollContainer!.scrollTop = savedScrollTop!;
            logRender('applyMarkdownToEditor restore scroll', {
              top: scrollContainer!.scrollTop,
            });
          });
        }
      });
    },
    [effectiveReadOnly]
  );

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
        updateYText(markdown, 'milkdown');
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
      const fragment = sharedConnection.fragment;
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
      yFragmentRef.current = fragment;
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
      yFragmentRef.current = connection.fragment;
      shouldDestroyConnection = true;
    }

    // Если Y.Text пуст и есть initialMarkdown — запишем его один раз
    if (initialMarkdown && yTextRef.current && yTextRef.current.length === 0) {
      try {
        yTextRef.current.insert(0, initialMarkdown);
      } catch (e) {
        console.error('[MilkdownEditor] Failed to set initialMarkdown into Y.Text', e);
      }
    }

    // Наблюдаем Y.Text: на внешние/textarea изменения парсим markdown в ProseMirror,
    // чтобы заполнить XmlFragment. Пропускаем локальные изменения Milkdown и фокус.
    const observer = (event: any) => {
      const origin = event?.transaction?.origin;
      if (origin === 'milkdown' || origin === 'markdown-editor') return;
      if (applyingRemoteRef.current) return;

      const editorInstance = editorRef.current;
      if (!editorInstance) return;

      let editorFocused = false;
      try {
        editorInstance.action((ctx: Ctx) => {
          const view = ctx.get(editorViewCtx);
          if (view) {
            editorFocused = view.hasFocus() || document.activeElement === view.dom;
          }
        });
      } catch {
        // ignore
      }
      if (editorFocused) return; // не трогаем, если пользователь печатает

      const markdown = yTextRef.current?.toString?.() ?? '';
      logRender('Y.Text observer -> apply to editor', {
        origin,
        length: markdown.length,
      });
      applyingRemoteRef.current = true;
      applyMarkdownToEditor(markdown, { addToHistory: false, preserveSelection: false });
      applyingRemoteRef.current = false;
      onContentChange?.(markdown, { origin: 'sync' });
    };

    yTextRef.current?.observe(observer);
    observerRef.current = observer;

    // Первичное заполнение XmlFragment: если есть markdown — применяем к редактору.
    const initialMarkdownToApply = yTextRef.current?.toString?.() ?? '';
    if (!initialApplyDoneRef.current && initialMarkdownToApply && editorRef.current) {
      logRender('Initial markdown apply to editor from Y.Text', {
        length: initialMarkdownToApply.length,
      });
      applyingRemoteRef.current = true;
      applyMarkdownToEditor(initialMarkdownToApply, { addToHistory: false, preserveSelection: false });
      applyingRemoteRef.current = false;
      initialApplyDoneRef.current = true;
    } else if (initialApplyDoneRef.current) {
      logRender('Initial markdown apply skipped (already applied)');
    }

    // Подписки на статус/ошибки для индикаторов
    let offStatus: (() => void) | undefined;
    let offError: (() => void) | undefined;

    if (provider && typeof provider.on === 'function') {
      const handleStatus = (event: { status: string }) => {
        if (!isMounted) return;
        setIsConnected(event.status === 'connected');
        if (event.status === 'connected') {
          setError(null);
        }
      };
      const handleError = (err: Error) => {
        if (!isMounted) return;
        setError(err.message);
        setIsConnected(false);
      };

      provider.on('status', handleStatus);
      provider.on('connection-error', handleError);
      offStatus = () => provider.off?.('status', handleStatus);
      offError = () => provider.off?.('connection-error', handleError);
    }

    return () => {
      isMounted = false;
      offStatus?.();
      offError?.();
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
