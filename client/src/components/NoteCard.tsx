import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVerticalIcon, UsersIcon, GlobeIcon } from './icons';
import { useSidebarStore } from '../hooks/useStores';
import { useToastContext } from '../contexts/ToastContext';
import { useModal } from '../hooks/useModal';
import { Modal } from './Modal';
import $api from '../http';
import styles from './NoteCard.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    excerpt?: string;
    rendered?: string;
    searchableContent?: string;
    updatedAt: string;
    createdAt: string;
    isFavorite?: boolean;
    isShared?: boolean;
  };
  viewMode: 'grid' | 'list';
  onDelete?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, viewMode, onDelete }) => {
  const navigate = useNavigate();
  const sidebarStore = useSidebarStore();
  const toast = useToastContext();
  const { modalState, showModal, closeModal } = useModal();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isPublic, setIsPublic] = useState<boolean>(!!note.isShared);

  useEffect(() => {
    setIsPublic(!!note.isShared);
  }, [note.isShared]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleCardClick = () => {
    navigate(`/note/${note.id}`);
  };

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    // Navigate to note and trigger rename in sidebar
    navigate(`/note/${note.id}`);
    setTimeout(() => {
      sidebarStore.startEditing(note.id, 'rename');
    }, 100);
  };

  const handleCreateSubnote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    navigate(`/note/${note.id}`);
    setTimeout(() => {
      sidebarStore.startEditing(`temp-subnote-${Date.now()}`, 'create-subnote', note.id);
    }, 100);
  };

  const handleTogglePublic = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    const makePublic = !isPublic;

    try {
      await $api.put(`/notes/${note.id}`, { isPublic: makePublic });
      setIsPublic(makePublic);
      toast.success(makePublic ? 'Note is now public' : 'Note is now private');
    } catch (err: any) {
      console.error('Failed to toggle public state:', err);
      // Детальная ошибка уйдет в общий axios‑toast
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    showModal(
      'Удалить заметку',
      `Вы уверены, что хотите удалить "${note.title}"? Это действие нельзя отменить.`,
      async () => {
        try {
          await $api.delete(`/notes/${note.id}`);
          toast.success('Заметка удалена');
          if (onDelete) {
            onDelete();
          }
        } catch (err: any) {
          console.error('Failed to delete note:', err);
          // Error toast is handled by axios interceptor
        }
      },
      {
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'danger',
      }
    );
  };

  // Get preview text - try excerpt first, then searchableContent, then rendered
  let previewText = '';
  if (note.excerpt && note.excerpt.trim()) {
    previewText = note.excerpt.trim();
  } else if (note.searchableContent && note.searchableContent.trim()) {
    previewText = note.searchableContent.trim().slice(0, 200);
  } else if (note.rendered && note.rendered.trim()) {
    previewText = note.rendered.trim();
  }
  
  // Remove HTML tags and clean up
  const cleanPreview = previewText
    ? previewText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    : '';
  
  const displayPreview = cleanPreview.slice(0, 150);

  if (viewMode === 'list') {
    return (
      <>
        <div
          className={cn(
            styles.noteCard,
            styles.noteCardList,
            showMenu && styles.noteCardMenuOpen
          )}
          onClick={handleCardClick}
        >
          <div className={styles.noteCardContent}>
            <div className={styles.noteCardHeader}>
              <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>
              <div className={styles.noteCardActions} ref={menuRef}>
                <button
                  className={styles.menuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                >
                  <MoreVerticalIcon className={styles.menuIcon} />
                </button>
                {showMenu && (
                  <div className={styles.dropdownMenu}>
                    <button className={styles.dropdownItem} onClick={handleTogglePublic}>
                      {isPublic ? 'Make private' : 'Make public'}
                    </button>
                    <button className={styles.dropdownItem} onClick={handleRename}>
                      Rename
                    </button>
                    <button className={styles.dropdownItem} onClick={handleCreateSubnote}>
                      Create subnote
                    </button>
                    <button
                      className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                      onClick={handleDelete}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {displayPreview ? (
              <p className={styles.notePreview}>{displayPreview}{cleanPreview.length >= 150 ? '…' : ''}</p>
            ) : (
              <p className={styles.notePreviewEmpty}>No preview available</p>
            )}

            <div className={styles.noteCardFooter}>
              <p className={styles.noteMeta}>
                Обновлено {new Date(note.updatedAt).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
              {(note.isFavorite || isPublic) && (
                <div className={styles.noteBadges}>
                  {note.isFavorite && <span className={styles.badge}>⭐</span>}
                  {isPublic && (
                    <span className={styles.badge} title="Public">
                      <GlobeIcon className={styles.sharedIcon} />
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {modalState && (
          <Modal
            isOpen={modalState.isOpen}
            onClose={closeModal}
            title={modalState.title}
            message={modalState.message}
            confirmText={modalState.confirmText}
            cancelText={modalState.cancelText}
            onConfirm={modalState.onConfirm}
            variant={modalState.variant}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          styles.noteCard,
          styles.noteCardGrid,
          showMenu && styles.noteCardMenuOpen
        )}
        onClick={handleCardClick}
      >
        <div className={styles.noteCardHeader}>
          <h3 className={styles.noteTitle}>{note.title || 'Untitled'}</h3>
          <div className={styles.noteCardActions} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVerticalIcon className={styles.menuIcon} />
            </button>
            {showMenu && (
              <div className={styles.dropdownMenu}>
                <button className={styles.dropdownItem} onClick={handleTogglePublic}>
                  {isPublic ? 'Make private' : 'Make public'}
                </button>
                <button className={styles.dropdownItem} onClick={handleRename}>
                  Rename
                </button>
                <button className={styles.dropdownItem} onClick={handleCreateSubnote}>
                  Create subnote
                </button>
                <button
                  className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {displayPreview ? (
          <p className={styles.notePreview}>{displayPreview}{displayPreview.length >= 150 ? '…' : ''}</p>
        ) : (
          <p className={styles.notePreviewEmpty}>No preview available</p>
        )}

        <div className={styles.noteCardFooter}>
          <p className={styles.noteMeta}>
            {new Date(note.updatedAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          {(note.isFavorite || isPublic) && (
            <div className={styles.noteBadges}>
              {note.isFavorite && <span className={styles.badge}>⭐</span>}
              {isPublic && (
                <span className={styles.badge} title="Public">
                  <GlobeIcon className={styles.sharedIcon} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {modalState && (
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          onConfirm={modalState.onConfirm}
          variant={modalState.variant}
        />
      )}
    </>
  );
};

