import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MilkdownEditor } from './MilkdownEditor';
import { useNoteYDoc } from '../hooks/useNoteYDoc';
import styles from './NoteViewer.module.css';

const cx = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

// Иконки для toolbar
const BoldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);

const ItalicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const ListIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ListOrderedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <line x1="4" y1="6" x2="4" y2="6" />
    <line x1="4" y1="12" x2="4" y2="12" />
    <line x1="4" y1="18" x2="4" y2="18" />
  </svg>
);

const QuoteIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
  </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const MaximizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

type PreviewMode = 'split' | 'edit' | 'preview';

type NoteViewerProps = {
  noteId: string;
  permission: 'edit' | 'read';
  getToken?: () => string | null;
  className?: string;
};

// Максимальный размер истории для undo/redo
const MAX_HISTORY = 200;

// Компонент только для чтения (fullscreen preview)
export const ReadNote: React.FC<{
  noteId: string;
  getToken?: () => string | null;
  className?: string;
}> = ({ noteId, getToken, className }) => {
  return (
    <div className={cx(styles.viewer, className)}>
      <MilkdownEditor
        key={`preview-only-${noteId}`}
        noteId={noteId}
        readOnly={true}
        getToken={getToken}
        className={className}
      />
    </div>
  );
};

// Основной split‑режим: слева markdown‑текст, справа preview (readOnly Milkdown)
export const SplitEditNote: React.FC<{
  noteId: string;
  getToken?: () => string | null;
  className?: string;
}> = ({ noteId, getToken, className }) => {
  const { markdown, setMarkdown, isLoading, sharedConnection, applyContentToYjs } = useNoteYDoc({
    noteId,
    getToken,
    enabled: true,
  });

  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [wordCount, setWordCount] = useState(0);
  const historyInitializedRef = useRef(false);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyDebounceResetRedoRef = useRef(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const markdownRef = useRef(markdown);
  const isUndoRedoInProgressRef = useRef(false);
  const isScrollingRef = useRef(false);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const savedTextareaScrollRef = useRef<number>(0);

  // Подсчет слов
  useEffect(() => {
    const words = markdown.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [markdown]);
  
  // Синхронизируем ref с актуальным markdown
  useEffect(() => {
    markdownRef.current = markdown;
  }, [markdown]);

  // Инициализация истории после первой загрузки markdown из Yjs
  useEffect(() => {
    // Ждём, пока useNoteYDoc загрузит начальное состояние из Yjs
    if (!historyInitializedRef.current && !isLoading) {
      historyInitializedRef.current = true;
      // Если начальное состояние пустое, не считаем его шагом истории,
      // чтобы первое undo не превращало заметку в пустую.
      if (markdown && markdown.length > 0) {
        setHistory([markdown]);
      } else {
        setHistory([]);
      }
      setRedoStack([]);
    }
  }, [markdown, isLoading]);

  // Синхронизация скролла между textarea и preview
  useEffect(() => {
    if (previewMode !== 'split') return;
    
    const textarea = textareaRef.current;
    const previewScroll = previewScrollContainerRef.current;
    
    if (!textarea || !previewScroll) return;
    
    // Находим реальный скроллируемый элемент внутри preview
    // Это может быть .editorContainer внутри MilkdownEditor
    const findScrollableElement = (container: HTMLElement): HTMLElement | null => {
      // Ищем milkdown-readonly-container или milkdown-editor-container (это классы из MilkdownEditor.module.css)
      const milkdownContainer = container.querySelector('.milkdown-readonly-container, .milkdown-editor-container') as HTMLElement;
      if (milkdownContainer) {
        return milkdownContainer;
      }
      // Ищем .editorContainer внутри MilkdownEditor (это основной скроллируемый элемент)
      const editorContainer = container.querySelector('.editorContainer') as HTMLElement;
      if (editorContainer && editorContainer.scrollHeight > editorContainer.clientHeight) {
        return editorContainer;
      }
      // Ищем любой элемент с overflow: auto или scroll
      const allElements = container.querySelectorAll('*');
      for (const el of Array.from(allElements)) {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);
        if ((style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll') 
            && htmlEl.scrollHeight > htmlEl.clientHeight) {
          return htmlEl;
        }
      }
      // Проверяем сам контейнер
      if (container.scrollHeight > container.clientHeight) {
        return container;
      }
      return null;
    };
    
    let cleanup: (() => void) | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const setupScrollSync = (textareaEl: HTMLTextAreaElement, previewEl: HTMLElement): (() => void) => {
      const handleTextareaScroll = () => {
        if (isScrollingRef.current) return;
        
        isScrollingRef.current = true;
        
        const textareaMaxScroll = textareaEl.scrollHeight - textareaEl.clientHeight;
        const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        
        if (textareaMaxScroll > 0 && previewMaxScroll > 0) {
          // Вычисляем пропорцию скролла
          const scrollRatio = textareaEl.scrollTop / textareaMaxScroll;
          // Применяем ту же пропорцию к preview
          const targetScroll = scrollRatio * previewMaxScroll;
          previewEl.scrollTop = targetScroll;
        }
        
        // Сбрасываем флаг после небольшой задержки, чтобы избежать циклов
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrollingRef.current = false;
        }, 10);
      };
      
      const handlePreviewScroll = () => {
        if (isScrollingRef.current) return;
        
        // Проверяем, что скролл происходит от пользователя, а не от программных изменений
        // Если textarea не в фокусе, не синхронизируем скролл (это может быть от tooltip или других программных изменений)
        const isTextareaFocused = document.activeElement === textareaEl;
        
        // Если textarea не в фокусе, не синхронизируем скролл
        // Это предотвращает сброс скролла при использовании tooltip
        if (!isTextareaFocused) {
          return;
        }
        
        isScrollingRef.current = true;
        
        const textareaMaxScroll = textareaEl.scrollHeight - textareaEl.clientHeight;
        const previewMaxScroll = previewEl.scrollHeight - previewEl.clientHeight;
        
        if (textareaMaxScroll > 0 && previewMaxScroll > 0) {
          // Вычисляем пропорцию скролла
          const scrollRatio = previewEl.scrollTop / previewMaxScroll;
          // Применяем ту же пропорцию к textarea
          const targetScroll = scrollRatio * textareaMaxScroll;
          textareaEl.scrollTop = targetScroll;
        }
        
        // Сбрасываем флаг после небольшой задержки, чтобы избежать циклов
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isScrollingRef.current = false;
        }, 10);
      };
      
      // Используем passive: true для лучшей производительности
      textareaEl.addEventListener('scroll', handleTextareaScroll, { passive: true });
      previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true });
      
      return () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        textareaEl.removeEventListener('scroll', handleTextareaScroll);
        previewEl.removeEventListener('scroll', handlePreviewScroll);
      };
    };
    
    // Ждем немного, чтобы MilkdownEditor успел отрендериться
    const initTimeout = setTimeout(() => {
      const previewScrollElement = findScrollableElement(previewScroll);
      
      if (!previewScrollElement) {
        // Если не нашли, пробуем еще раз через небольшую задержку
        const retryTimeout = setTimeout(() => {
          const retryElement = findScrollableElement(previewScroll);
          if (retryElement) {
            cleanup = setupScrollSync(textarea, retryElement);
          }
        }, 200);
        return () => clearTimeout(retryTimeout);
      }
      
      cleanup = setupScrollSync(textarea, previewScrollElement);
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (cleanup) cleanup();
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [previewMode, markdown, isLoading]);

  // Принудительно обновляем preview при переключении режима
  // Это гарантирует, что содержимое будет отображаться после переключения
  useEffect(() => {
    if ((previewMode === 'preview' || previewMode === 'split') && sharedConnection && sharedConnection.text && markdown !== undefined && !isLoading) {
      // Принудительно обновляем Yjs text, чтобы MilkdownEditor получил обновление через observer
      // Используем несколько попыток с разными задержками для надежности
      const timers: ReturnType<typeof setTimeout>[] = [];
      
      [100, 300, 500, 800].forEach((delay) => {
        const timer = setTimeout(() => {
          if (sharedConnection && sharedConnection.text) {
            const currentText = sharedConnection.text.toString();
            // Обновляем только если содержимое отличается или при первой попытке
            if (currentText !== markdown || delay === 100) {
              sharedConnection.doc.transact(() => {
                if (currentText.length > 0) {
                  sharedConnection.text.delete(0, currentText.length);
                }
                if (markdown && markdown.length > 0) {
                  sharedConnection.text.insert(0, markdown);
                }
              }, 'sync');
            }
          }
        }, delay);
        timers.push(timer);
      });
      
      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [previewMode, markdown, sharedConnection, isLoading]);

  const pushToHistory = useCallback((value: string) => {
    setHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === value) {
        return prev;
      }
      const next = [...prev, value];
      if (next.length > MAX_HISTORY) {
        next.shift();
      }
      return next;
    });
  }, []);

  const flushHistoryDebounce = useCallback(() => {
    if (!historyDebounceRef.current) return;
    clearTimeout(historyDebounceRef.current);
    historyDebounceRef.current = null;
    // Используем ref для получения актуального markdown
    pushToHistory(markdownRef.current);
    if (historyDebounceResetRedoRef.current) {
      setRedoStack([]);
    }
    historyDebounceResetRedoRef.current = false;
  }, [pushToHistory]);

  const scheduleHistoryPush = useCallback(
    (value: string, resetRedo: boolean = false) => {
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
      }
      historyDebounceResetRedoRef.current = resetRedo;
      historyDebounceRef.current = setTimeout(() => {
        pushToHistory(value);
        if (resetRedo) {
          setRedoStack([]);
        }
        historyDebounceRef.current = null;
        historyDebounceResetRedoRef.current = false;
      }, 900);
    },
    [pushToHistory]
  );

  const handleMarkdownChange = (newContent: string) => {
    if (newContent === markdown) return;
    
    // Сохраняем позицию скролла перед изменением, если textarea в фокусе
    const textarea = textareaRef.current;
    if (textarea && document.activeElement === textarea) {
      savedTextareaScrollRef.current = textarea.scrollTop;
    }
    
    setMarkdown(newContent);
    applyContentToYjs(newContent);
    scheduleHistoryPush(newContent, true);
    
    // Восстанавливаем позицию скролла после изменения
    if (textarea && document.activeElement === textarea) {
      requestAnimationFrame(() => {
        if (textarea && document.activeElement === textarea) {
          textarea.scrollTop = savedTextareaScrollRef.current;
        }
      });
    }
  };

  const handleUndo = useCallback(() => {
    flushHistoryDebounce();
    isUndoRedoInProgressRef.current = true;
    
    setHistory(prev => {
      // Если история пустая или только один элемент - нечего откатывать
      if (prev.length === 0) {
        isUndoRedoInProgressRef.current = false;
        return prev;
      }
      
      // Если только один элемент - откатываем к нему (это начальное состояние)
      if (prev.length === 1) {
        const initialState = prev[0];
        setMarkdown(initialState);
        applyContentToYjs(initialState, 'undo-redo');
        // Сбрасываем флаг после небольшой задержки, чтобы Yjs observer успел обработать
        setTimeout(() => {
          isUndoRedoInProgressRef.current = false;
        }, 100);
        return prev; // История не меняется, но состояние откатывается
      }

      // Если больше одного элемента - откатываем к предыдущему
      const current = prev[prev.length - 1];
      const nextHistory = prev.slice(0, -1);
      const previous = nextHistory[nextHistory.length - 1] ?? '';

      // Текущее состояние идёт в redo stack
      setRedoStack(stack => [current, ...stack]);
      setMarkdown(previous);
      applyContentToYjs(previous, 'undo-redo');
      
      // Сбрасываем флаг после небольшой задержки
      setTimeout(() => {
        isUndoRedoInProgressRef.current = false;
      }, 100);

      return nextHistory;
    });
  }, [applyContentToYjs, flushHistoryDebounce, setMarkdown]);

  const handleRedo = useCallback(() => {
    // Для redo НЕ вызываем flushHistoryDebounce в начале,
    // т.к. это может добавить текущий markdown в историю ДО применения nextContent,
    // что создаёт конфликт. Вместо этого применяем изменения сразу.
    isUndoRedoInProgressRef.current = true;
    
    setRedoStack(prev => {
      if (prev.length === 0) {
        isUndoRedoInProgressRef.current = false;
        return prev;
      }

      const [nextContent, ...rest] = prev;
      
      // Сначала применяем изменения из redo stack
      setMarkdown(nextContent);
      applyContentToYjs(nextContent, 'undo-redo');
      
      // Потом добавляем в историю (всегда, даже если кажется дубликатом)
      // Это гарантирует синхронизацию состояния
      setHistory(hist => {
        // Всегда добавляем nextContent в историю для redo,
        // даже если он кажется дубликатом (т.к. текущий markdown может быть устаревшим)
        return [...hist, nextContent];
      });
      
      // Отменяем любой pending debounce, т.к. мы уже применили изменения
      if (historyDebounceRef.current) {
        clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = null;
      }
      
      // Сбрасываем флаг после небольшой задержки, чтобы Yjs observer успел обработать
      setTimeout(() => {
        isUndoRedoInProgressRef.current = false;
      }, 100);

      return rest;
    });
  }, [applyContentToYjs, setMarkdown]);

  const handleTextAreaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      handleUndo();
      return;
    }
    if (
      (event.ctrlKey && event.key.toLowerCase() === 'y') ||
      (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')
    ) {
      event.preventDefault();
      handleRedo();
    }
  };

  // Глобальное управление undo/redo и для textarea, и для preview (Milkdown)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      const code = event.code?.toLowerCase();
      const key = event.key.toLowerCase();
      const isUndoKey = code === 'keyz';
      const isRedoKey = code === 'keyy';
      if (!isUndoKey && !isRedoKey) return;

      const active = document.activeElement;
      const target = event.target as Node | null;

      const previewRoot = previewContainerRef.current;
      const inPreview =
        previewRoot &&
        ((active instanceof Node && previewRoot.contains(active)) ||
          (target && previewRoot.contains(target)));

      const inTextarea = active instanceof HTMLTextAreaElement;

      if (!inPreview && !inTextarea) return;

      if (isUndoKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handleUndo();
        return;
      }

      if (isRedoKey || (isUndoKey && event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => {
      window.removeEventListener('keydown', handler, true);
    };
  }, [handleUndo, handleRedo]);

  // Дополнительный обработчик прямо на preview контейнере (чтобы перебить keymap Milkdown)
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handler = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      const code = event.code?.toLowerCase();
      const isUndoKey = code === 'keyz';
      const isRedoKey = code === 'keyy';
      if (!isUndoKey && !isRedoKey) return;

      if (isUndoKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        handleUndo();
        return;
      }

      if (isRedoKey || (isUndoKey && event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        handleRedo();
      }
    };

    container.addEventListener('keydown', handler, true);
    return () => {
      container.removeEventListener('keydown', handler, true);
    };
  }, [handleUndo, handleRedo]);

  const handleContentChange = (content: string, meta?: { origin?: 'milkdown' | 'sync' }) => {
    // Игнорируем sync-изменения, которые приходят во время undo/redo
    // (они приходят от Yjs observer после того, как мы уже применили изменения)
    if (meta?.origin === 'sync' && isUndoRedoInProgressRef.current) {
      return;
    }
    
    // синхронизация истории при изменениях из Milkdown
    setMarkdown(content);
    if (meta?.origin === 'milkdown') {
      scheduleHistoryPush(content, true);
    }
  };

  // Вставка markdown форматирования
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Сохраняем позицию скролла перед операцией
    const savedScrollTop = textarea.scrollTop;
    savedTextareaScrollRef.current = savedScrollTop;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText =
      markdown.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      markdown.substring(end);

    handleMarkdownChange(newText);

    // Восстанавливаем позицию курсора и скролла
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
      // Восстанавливаем позицию скролла
      textarea.scrollTop = savedScrollTop;
    }, 0);
  };

  return (
    <div className={cx(styles.viewer, className)}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('**', '**')}
            title="Bold"
          >
            <BoldIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('_', '_')}
            title="Italic"
          >
            <ItalicIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('[', '](url)')}
            title="Link"
          >
            <LinkIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('`', '`')}
            title="Code"
          >
            <CodeIcon className={styles.toolbarIcon} />
          </button>
          <div className={styles.toolbarSeparator} />
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('- ')}
            title="Unordered List"
          >
            <ListIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('1. ')}
            title="Ordered List"
          >
            <ListOrderedIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('> ')}
            title="Quote"
          >
            <QuoteIcon className={styles.toolbarIcon} />
          </button>
          <div className={styles.toolbarSeparator} />
          <button
            className={styles.toolbarButton}
            onClick={() => insertMarkdown('![alt](', ')')}
            title="Image"
          >
            <ImageIcon className={styles.toolbarIcon} />
          </button>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={cx(styles.toolbarButton, previewMode === 'edit' && styles.toolbarButtonActive)}
            onClick={() => setPreviewMode('edit')}
            title="Edit Mode"
          >
            <EyeOffIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={cx(styles.toolbarButton, previewMode === 'split' && styles.toolbarButtonActive)}
            onClick={() => setPreviewMode('split')}
            title="Split Mode"
          >
            <MaximizeIcon className={styles.toolbarIcon} />
          </button>
          <button
            className={cx(styles.toolbarButton, previewMode === 'preview' && styles.toolbarButtonActive)}
            onClick={() => setPreviewMode('preview')}
            title="Preview Mode"
          >
            <EyeIcon className={styles.toolbarIcon} />
          </button>
        </div>
      </div>

      {/* Editor & Preview */}
      <div className={styles.editorContainer}>
        {previewMode === 'split' ? (
          /* Split Mode - используем PanelGroup */
          <PanelGroup direction="horizontal" className={styles.panelGroup}>
            <Panel defaultSize={50} minSize={20}>
              <div className={styles.leftPane}>
                <textarea
                  ref={textareaRef}
                  value={markdown}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  onKeyDown={handleTextAreaKeyDown}
                  className={styles.markdownTextarea}
                  placeholder={isLoading ? 'Загрузка...' : 'Start writing...'}
                />
              </div>
            </Panel>
            <PanelResizeHandle className={styles.resizeHandle} />
            <Panel defaultSize={50} minSize={20}>
              <div className={styles.rightPane}>
                <div ref={previewScrollContainerRef} className={styles.previewScroll}>
                  <MilkdownEditor
                    key={`preview-${noteId}`}
                    noteId={noteId}
                    readOnly={true}
                    onContentChange={handleContentChange}
                    getToken={getToken}
                    sharedConnection={sharedConnection || undefined}
                    expectSharedConnection
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                  />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          /* Edit или Preview Mode */
          <div className={styles.singleModeContainer}>
            {/* Preview - всегда рендерится, скрывается в edit режиме */}
            <div 
              ref={previewContainerRef} 
              className={cx(
                styles.previewScroll,
                previewMode === 'edit' && styles.previewHidden,
                previewMode === 'preview' && styles.previewFull
              )}
            >
              <MilkdownEditor
                key={`preview-${noteId}`}
                noteId={noteId}
                readOnly={true}
                onContentChange={handleContentChange}
                getToken={getToken}
                sharedConnection={sharedConnection || undefined}
                expectSharedConnection
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>
            {/* Editor - показывается только в edit режиме */}
            {previewMode === 'edit' && (
              <div className={styles.leftPane}>
                <textarea
                  ref={textareaRef}
                  value={markdown}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  onKeyDown={handleTextAreaKeyDown}
                  className={styles.markdownTextarea}
                  placeholder={isLoading ? 'Загрузка...' : 'Start writing...'}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomBarLeft}>
          <span>{wordCount} words</span>
          <span className={styles.bottomBarSeparator}>•</span>
          <span className={styles.bottomBarEditable}>You can edit</span>
        </div>
        <div className={styles.bottomBarRight}>
          <span className={styles.autoSaved}>
            <span className={styles.autoSavedDot}></span>
            Auto-saved
          </span>
        </div>
      </div>
    </div>
  );
};

// Обёртка, которая выбирает нужный режим по permission
export const NoteViewer: React.FC<NoteViewerProps> = ({
  noteId,
  permission,
  getToken,
  className,
}) => {
  if (permission === 'read') {
    return <ReadNote noteId={noteId} getToken={getToken} className={className} />;
  }

  // сейчас по умолчанию используем SplitEditNote для режима edit
  return <SplitEditNote noteId={noteId} getToken={getToken} className={className} />;
};

