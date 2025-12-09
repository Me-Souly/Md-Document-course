import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useYjsConnection } from './hooks/useYjsConnection';
import { useMarkdownSync } from './hooks/useMarkdownSync';
import { useYjsTextUpdate } from './hooks/useYjsTextUpdate';
import * as styles from './MilkdownEditor.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

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
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<((event: any) => void) | null>(null);

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

  const effectiveReadOnly = expectSharedConnection ? false : readOnly;

  const { connection, yText, yFragment, error } = useYjsConnection({
    noteId,
    readOnly,
    getToken,
    sharedConnection,
    expectSharedConnection,
    initialMarkdown,
  });

  const { updateYText } = useYjsTextUpdate();

  const { applyMarkdownToEditor, setupYTextObserver, applyInitialMarkdown, applyingRemoteRef } = useMarkdownSync({
    editorRef,
    effectiveReadOnly,
    useYSyncPlugin: expectSharedConnection && !!sharedConnection && !!yFragment,
    onContentChange: (content, meta) => {
      onContentChange?.(content, meta);
      // Обновляем Y.Text только если изменения пришли от самого редактора
      if (yText && meta?.origin === 'milkdown') {
        updateYText(content, 'milkdown', yText);
      }
    },
    updateYText: (markdown, origin) => {
      if (yText) {
        updateYText(markdown, origin, yText);
      }
    },
  });

  // Настройка плагинов ProseMirror
  // ВАЖНО: ySyncPlugin используется только для синхронизации изменений из самого редактора
  // Изменения из Y.Text (textarea) применяются напрямую через applyMarkdownToEditor
  // Это предотвращает конфликты между Y.Text и YXmlFragment
  useEffect(() => {
    if (loading) return;
    if (!isEditorReady) return;
    const editor = editorRef.current;
    if (!editor || !yFragment) return;

    try {
      editor.action((ctx: Ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) return;

        const state = view.state;
        const plugins = state.plugins;

        // Проверяем, не добавлен ли уже ySyncPlugin
        const hasYSyncPlugin = plugins.some((p: any) => {
          const key = p.key;
          return key && (key.toString().includes('yjs') || key.toString().includes('ySync'));
        });

        if (hasYSyncPlugin) {
          // Плагин уже добавлен, не добавляем повторно
          return;
        }

        const customKeymap = keymap({
          'Mod-z': () => true,
          'Mod-y': () => true,
          'Mod-Shift-z': () => true,
        });

        // Создаем ySyncPlugin только для синхронизации изменений из самого редактора
        // Изменения из Y.Text применяются напрямую и НЕ синхронизируются через ySyncPlugin
        const ySync = ySyncPlugin(yFragment);

        const newPlugins = [
          ySync,
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
  }, [loading, isEditorReady, effectiveReadOnly, yFragment]);

  // Сохраняем ссылку на редактор после инициализации
  useEffect(() => {
    if (loading) return;
    try {
      const editor = get();
      if (editor) {
        editorRef.current = editor;
        setIsEditorReady(true);
      }
    } catch (error) {
      console.error('[MilkdownEditor] Error getting editor:', error);
    }
  }, [get, loading]);

  // Применение readOnly состояния
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

  useEffect(() => {
    if (!isEditorReady) return;
    applyReadOnlyState(effectiveReadOnly);
  }, [isEditorReady, effectiveReadOnly, applyReadOnlyState]);

  // Перехват undo/redo для preview режима
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

  // Настройка listener для изменений из Milkdown
  useEffect(() => {
    if (!isEditorReady) return;
    const editor = editorRef.current;
    if (!editor) return;

    try {
      editor.action((ctx: Ctx) => {
        const manager = ctx.get(listenerCtx as any) as any;
        if (!manager) return;
        manager.markdownUpdated((_ctx: unknown, markdown: string) => {
          if (applyingRemoteRef.current) return;
          onContentChange?.(markdown, { origin: 'milkdown' });
          // Обновляем Y.Text только если не используем sharedConnection
          // В режиме с sharedConnection y-prosemirror сам синхронизирует через YXmlFragment
          if (yText && !expectSharedConnection) {
            updateYText(markdown, 'milkdown', yText);
          }
        });
      });
    } catch (error) {
      console.error('[MilkdownEditor] Error setting up listener:', error);
    }
  }, [isEditorReady, onContentChange, yText, updateYText, applyingRemoteRef, expectSharedConnection]);

  // Настройка Y.Text observer и начальное применение
  // В режиме с sharedConnection: ySyncPlugin синхронизирует ProseMirror <-> YXmlFragment
  // Y.Text observer нужен для синхронизации изменений из textarea (Y.Text -> ProseMirror)
  useEffect(() => {
    if (loading) return;
    if (!isEditorReady) return;
    const editor = editorRef.current;
    if (!editor) return;

    if (readOnly && expectSharedConnection && !sharedConnection && !connection) {
      return;
    }

    if (!yText) return;

    // В режиме с sharedConnection ySyncPlugin синхронизирует через YXmlFragment
    // Но нам все еще нужен observer для синхронизации изменений из textarea (Y.Text -> ProseMirror)
    const observer = setupYTextObserver(yText, editor);
    observerRef.current = observer;

    // Применяем начальный markdown только если не используется sharedConnection
    // В режиме с sharedConnection ySyncPlugin сам синхронизирует начальное состояние
    if (!expectSharedConnection || !sharedConnection) {
      const initialMarkdownToApply = yText?.toString?.() ?? '';
      if (initialMarkdownToApply) {
        // Небольшая задержка, чтобы ySyncPlugin успел инициализироваться (если используется)
        setTimeout(() => {
          if (editorRef.current) {
            applyInitialMarkdown(initialMarkdownToApply, editor);
          }
        }, expectSharedConnection ? 200 : 100);
      }
    }

    return () => {
      if (yText && observerRef.current) {
        yText.unobserve(observerRef.current);
      }
      observerRef.current = null;
    };
  }, [loading, isEditorReady, yText, setupYTextObserver, applyInitialMarkdown, readOnly, expectSharedConnection, sharedConnection, connection]);

  // Управление индикатором загрузки
  useEffect(() => {
    if (!loading) {
      setShowLoadingIndicator(false);
    } else {
      const timeout = setTimeout(() => {
        setShowLoadingIndicator(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

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
