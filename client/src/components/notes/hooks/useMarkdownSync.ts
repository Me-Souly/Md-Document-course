import { useCallback, useRef } from 'react';
import { Ctx, parserCtx, editorViewCtx } from '@milkdown/core';
import { EditorState } from 'prosemirror-state';
import { ySyncPluginKey } from 'y-prosemirror';
import { ySyncPluginKey } from 'y-prosemirror';

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

interface UseMarkdownSyncProps {
  editorRef: React.MutableRefObject<any>;
  effectiveReadOnly: boolean;
  onContentChange?: (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => void;
  updateYText: (markdown: string, origin?: string) => void;
  useYSyncPlugin?: boolean; // Флаг, указывающий, используется ли ySyncPlugin
}

export const useMarkdownSync = ({
  editorRef,
  effectiveReadOnly,
  onContentChange,
  updateYText,
  useYSyncPlugin = false,
}: UseMarkdownSyncProps) => {
  const applyingRemoteRef = useRef(false);
  const initialApplyDoneRef = useRef(false);

  const applyMarkdownToEditor = useCallback(
    (markdown: string, { preserveSelection = false, addToHistory = false }: { preserveSelection?: boolean; addToHistory?: boolean } = {}) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.action((ctx: Ctx) => {
        const parser = ctx.get(parserCtx);
        const view = ctx.get(editorViewCtx);
        if (!parser || !view) {
          return;
        }

        const doc = parser(markdown);
        if (!doc) {
          return;
        }

        let savedScrollTop: number | null = null;
        let scrollContainer: HTMLElement | null = null;
        if (effectiveReadOnly) {
          scrollContainer = findScrollContainer(view.dom as HTMLElement);
          if (scrollContainer) {
            savedScrollTop = scrollContainer.scrollTop;
          }
        }

        // ВАЖНО: Когда используется ySyncPlugin, временно отключаем синхронизацию
        // чтобы предотвратить ошибку "Unexpected content type in insert operation"
        const ySyncState = useYSyncPlugin ? ySyncPluginKey.getState(view.state) : null;
        const binding = ySyncState?.binding;
        let originalProsemirrorChanged: any = null;
        let wasMuxActive = false;
        
        if (binding && useYSyncPlugin) {
          // Временно отключаем синхронизацию
          originalProsemirrorChanged = binding._prosemirrorChanged;
          binding._prosemirrorChanged = () => {
            // Игнорируем синхронизацию для этой транзакции
          };
          // Отключаем mux, если он активен
          if (binding.mux) {
            wasMuxActive = true;
            binding.mux = () => {}; // Пустая функция
          }
        }

        // Используем мета-данные для предотвращения конфликтов с y-prosemirror
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content);
        tr.setMeta('addToHistory', addToHistory);
        // Указываем, что это изменение из markdown, а не из y-prosemirror
        tr.setMeta('origin', 'markdown-editor');
        // Отключаем синхронизацию y-prosemirror
        if (useYSyncPlugin) {
          tr.setMeta(ySyncPluginKey, { isChangeOrigin: false });
        }

        if (preserveSelection) {
          const { from, to } = view.state.selection;
          const maxPos = tr.doc.content.size;
          const validFrom = Math.min(from, maxPos);
          const validTo = Math.min(to, maxPos);
          const { TextSelection } = require('prosemirror-state');
          tr.setSelection(TextSelection.create(tr.doc, validFrom, validTo));
        }

        view.dispatch(tr);

        // Восстанавливаем синхронизацию после применения транзакции
        if (binding && useYSyncPlugin) {
          if (originalProsemirrorChanged) {
            binding._prosemirrorChanged = originalProsemirrorChanged;
          }
          // Восстанавливаем mux, если он был активен
          if (wasMuxActive && binding.mux) {
            // mux восстанавливается автоматически при следующем изменении
          }
        }

        if (effectiveReadOnly && scrollContainer && savedScrollTop !== null) {
          requestAnimationFrame(() => {
            scrollContainer!.scrollTop = savedScrollTop!;
          });
        }
      });
    },
    [editorRef, effectiveReadOnly, useYSyncPlugin]
  );

  const setupYTextObserver = useCallback(
    (yText: any, editor: any) => {

      const observer = (event: any) => {
        const origin = event?.transaction?.origin;
        // Пропускаем изменения, которые пришли от самого редактора или от markdown-editor
        // Также пропускаем изменения от yjs (y-prosemirror синхронизирует через YXmlFragment)
        if (origin === 'milkdown' || origin === 'markdown-editor' || origin === 'yjs' || origin === 'y-prosemirror') return;
        if (applyingRemoteRef.current) return;

        let editorFocused = false;
        try {
          editor.action((ctx: Ctx) => {
            const view = ctx.get(editorViewCtx);
            if (view) {
              editorFocused = view.hasFocus() || document.activeElement === view.dom;
            }
          });
        } catch {
          // ignore
        }
        // Не применяем изменения, если редактор в фокусе
        if (editorFocused) return;

        const markdown = yText?.toString?.() ?? '';
        // Не применяем пустой markdown
        if (!markdown || markdown.trim().length === 0) return;
        
        applyingRemoteRef.current = true;
        applyMarkdownToEditor(markdown, { addToHistory: false, preserveSelection: false });
        applyingRemoteRef.current = false;
        onContentChange?.(markdown, { origin: 'sync' });
      };

      yText?.observe(observer);
      return observer;
    },
    [applyMarkdownToEditor, onContentChange]
  );

  const applyInitialMarkdown = useCallback(
    (markdown: string, editor: any) => {
      if (!initialApplyDoneRef.current && markdown && editor) {
        applyingRemoteRef.current = true;
        applyMarkdownToEditor(markdown, { addToHistory: false, preserveSelection: false });
        applyingRemoteRef.current = false;
        initialApplyDoneRef.current = true;
      }
    },
    [applyMarkdownToEditor]
  );

  return {
    applyMarkdownToEditor,
    setupYTextObserver,
    applyInitialMarkdown,
    applyingRemoteRef,
    initialApplyDoneRef,
  };
};

