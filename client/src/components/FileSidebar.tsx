import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useSidebarStore } from '../hooks/useStores';
import { FileTreeNode } from '../types/notes';
import { useNavigate } from 'react-router-dom';
import styles from './FileSidebar.module.css';
import $api from '../http';

// Иконки (можно заменить на реальные иконки из библиотеки или использовать SVG)
const FileTextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FolderOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 3h9a2 2 0 0 1 2 2v1" />
    <path d="M5 19h14a2 2 0 0 0 2-2v-5H7a2 2 0 0 0-2 2v5z" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FolderPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const StarIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
  </svg>
);

const MoreVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const ChevronsLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="11 18 6 13 11 8" />
    <polyline points="18 18 13 13 18 8" />
  </svg>
);

const ChevronsRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="13 18 18 13 13 8" />
    <polyline points="6 18 11 13 6 8" />
  </svg>
);

// Утилита для объединения классов
const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TreeNodeProps {
  node: FileTreeNode;
  level: number;
  collapsed: boolean;
  currentNoteId?: string;
  onSelectNote: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = observer(({ node, level, collapsed, currentNoteId, onSelectNote }) => {
  const sidebarStore = useSidebarStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const isFolder = node.type === 'folder';
  const hasChildren = !!node.children && node.children.length > 0;
  const isActive = currentNoteId === node.id;
  const isExpanded = sidebarStore.isFolderExpanded(node.id);
  const isEditing = sidebarStore.isEditing(node.id);
  const editingMode = sidebarStore.getEditingMode();

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Фокус на input при начале редактирования
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      if (editingMode === 'rename') {
        setInputValue(node.name);
      } else {
        setInputValue('');
      }
    }
  }, [isEditing, editingMode, node.name]);

  const handleClick = () => {
    if (isEditing) return;
    if (isFolder) {
      sidebarStore.toggleFolder(node.id);
    } else {
      onSelectNote(node.id);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) {
        if (editingMode === 'rename') {
          sidebarStore.stopEditing();
        } else {
          // Отменяем создание, если пустое имя
          sidebarStore.stopEditing();
        }
        return;
      }

      if (editingMode === 'rename') {
        if (trimmed === node.name) {
          sidebarStore.stopEditing();
          return;
        }
        if (node.type === 'folder') {
          $api
            .put(`/folders/${node.id}`, { title: trimmed })
            .then((res) => {
              sidebarStore.updateNode(node.id, { name: res.data.name || res.data.title || trimmed });
              sidebarStore.stopEditing();
            })
            .catch((err) => {
              console.error('Failed to rename folder:', err);
              sidebarStore.stopEditing();
            });
        } else {
          $api
            .put(`/notes/${node.id}`, { title: trimmed })
            .then((res) => {
              sidebarStore.updateNode(node.id, { name: res.data.title || trimmed });
              sidebarStore.stopEditing();
            })
            .catch((err) => {
              console.error('Failed to rename note:', err);
              sidebarStore.stopEditing();
            });
        }
      } else if (editingMode === 'create-folder') {
        $api
          .post('/folders', { title: trimmed, parentId: sidebarStore.creatingParentId })
          .then((res) => {
            sidebarStore.addNodeFromServer({
              id: res.data.id,
              title: res.data.name || res.data.title || trimmed,
              type: 'folder',
              parentId: res.data.parentId,
            });
            if (sidebarStore.creatingParentId) {
              sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
            }
            sidebarStore.stopEditing();
          })
          .catch((err) => {
            console.error('Failed to create folder:', err);
            sidebarStore.stopEditing();
          });
      } else if (editingMode === 'create-note') {
        $api
          .post('/notes', { title: trimmed, folderId: sidebarStore.creatingParentId })
          .then((res) => {
            sidebarStore.addNodeFromServer({
              id: res.data.id,
              title: res.data.title,
              type: 'file',
              folderId: res.data.folderId,
            });
            if (sidebarStore.creatingParentId) {
              sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
            }
            sidebarStore.stopEditing();
          })
          .catch((err) => {
            console.error('Failed to create note in folder:', err);
            sidebarStore.stopEditing();
          });
      } else if (editingMode === 'create-subnote') {
        $api
          .post('/notes', { title: trimmed, parentId: sidebarStore.creatingParentId })
          .then((res) => {
            sidebarStore.addNodeFromServer({
              id: res.data.id,
              title: res.data.title,
              type: 'file',
              parentId: res.data.parentId,
            });
            if (sidebarStore.creatingParentId) {
              sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
            }
            sidebarStore.stopEditing();
          })
          .catch((err) => {
            console.error('Failed to create sub-note:', err);
            sidebarStore.stopEditing();
          });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      sidebarStore.stopEditing();
    }
  };

  const handleInputBlur = () => {
    // При потере фокуса сохраняем, если есть значение
    if (editingMode === 'rename') {
      const trimmed = inputValue.trim();
      if (trimmed && trimmed !== node.name) {
        if (node.type === 'folder') {
          $api
            .put(`/folders/${node.id}`, { title: trimmed })
            .then((res) => {
              sidebarStore.updateNode(node.id, { name: res.data.name || res.data.title || trimmed });
            })
            .catch((err) => console.error('Failed to rename folder:', err));
        } else {
          $api
            .put(`/notes/${node.id}`, { title: trimmed })
            .then((res) => {
              sidebarStore.updateNode(node.id, { name: res.data.title || trimmed });
            })
            .catch((err) => console.error('Failed to rename note:', err));
        }
      }
      sidebarStore.stopEditing();
    } else {
      // Для создания - сохраняем при потере фокуса, если есть значение
      const trimmed = inputValue.trim();
      if (trimmed) {
        if (editingMode === 'create-folder') {
          $api
            .post('/folders', { title: trimmed, parentId: sidebarStore.creatingParentId })
            .then((res) => {
              sidebarStore.addNodeFromServer({
                id: res.data.id,
                title: res.data.name || res.data.title || trimmed,
                type: 'folder',
                parentId: res.data.parentId,
              });
              if (sidebarStore.creatingParentId) {
                sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
              }
              sidebarStore.stopEditing();
            })
            .catch((err) => {
              console.error('Failed to create folder:', err);
              sidebarStore.stopEditing();
            });
        } else if (editingMode === 'create-note') {
          $api
            .post('/notes', { title: trimmed, folderId: sidebarStore.creatingParentId })
            .then((res) => {
              sidebarStore.addNodeFromServer({
                id: res.data.id,
                title: res.data.title,
                type: 'file',
                folderId: res.data.folderId,
              });
              if (sidebarStore.creatingParentId) {
                sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
              }
              sidebarStore.stopEditing();
            })
            .catch((err) => {
              console.error('Failed to create note in folder:', err);
              sidebarStore.stopEditing();
            });
        } else if (editingMode === 'create-subnote') {
          $api
            .post('/notes', { title: trimmed, parentId: sidebarStore.creatingParentId })
            .then((res) => {
              sidebarStore.addNodeFromServer({
                id: res.data.id,
                title: res.data.title,
                type: 'file',
                parentId: res.data.parentId,
              });
              if (sidebarStore.creatingParentId) {
                sidebarStore.expandedFolders.add(sidebarStore.creatingParentId);
              }
              sidebarStore.stopEditing();
            })
            .catch((err) => {
              console.error('Failed to create sub-note:', err);
              sidebarStore.stopEditing();
            });
        }
      } else {
        // Отменяем создание, если пусто
        sidebarStore.stopEditing();
      }
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sidebarStore.toggleFolder(node.id);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    sidebarStore.startDragging(node.id, node.type);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    sidebarStore.stopDragging();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!sidebarStore.canDropOn(node)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dragging = sidebarStore.draggingNode;
    if (!dragging) return;

    if (!sidebarStore.canDropOn(node)) return;

    // делаем целевой узел родителем: и папки, и заметки могут иметь детей
    const targetId = node.id;
    sidebarStore.moveNode(dragging.id, dragging.type, targetId);
    sidebarStore.stopDragging();

    // синхронизация с сервером
    if (dragging.type === 'file') {
      // перемещение заметки
      const update: any = {};
      if (node.type === 'folder') {
        // заметка внутри папки
        update.folderId = node.id;
        update.parentId = null;
      } else {
        // подзаметка внутри другой заметки
        update.parentId = node.id;
        // folderId не трогаем — останется как было
      }

      $api.put(`/notes/${dragging.id}`, update).catch((err) => {
        console.error('Failed to update note position:', err);
      });
    } else {
      // перемещение папки внутрь другой папки
      if (node.type === 'folder') {
        $api
          .put(`/folders/${dragging.id}`, { parentId: node.id })
          .catch((err) => {
            console.error('Failed to update folder position:', err);
          });
      }
    }
  };

  return (
    <div>
      <div
        className={cn(
          styles.treeNode,
          isActive && styles.treeNodeActive
        )}
        style={!collapsed && level > 0 ? { marginLeft: level * 18 } : undefined}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {hasChildren && !collapsed && (
          <button
            onClick={handleExpandClick}
            className={styles.expandButton}
          >
            {isExpanded ? (
              <ChevronDownIcon className={styles.iconSmall} />
            ) : (
              <ChevronRightIcon className={styles.iconSmall} />
            )}
          </button>
        )}

        {isFolder ? (
          isExpanded && !collapsed ? (
            <FolderOpenIcon className={cn(styles.icon, styles.iconPrimary)} />
          ) : (
            <FolderIcon className={cn(styles.icon, styles.iconMuted)} />
          )
        ) : (
          <FileTextIcon className={cn(styles.icon, styles.iconMuted)} />
        )}

        {!collapsed && (
          <>
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                className={styles.nodeNameInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                onClick={(e) => e.stopPropagation()}
                placeholder={editingMode === 'rename' ? node.name : 'Enter name...'}
              />
            ) : (
              <span className={styles.nodeName}>{node.name}</span>
            )}

            {!isEditing && (
              <div className={styles.dropdown} ref={dropdownRef}>
              <button
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
              >
                <MoreVerticalIcon className={styles.iconSmall} />
              </button>
              {showDropdown && (
                <div className={styles.dropdownMenu}>
                  <button
                    className={styles.dropdownItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      sidebarStore.startEditing(node.id, 'rename');
                    }}
                  >
                    Rename
                  </button>

                  {isFolder ? (
                    <>
                      <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', node.id);
                        }}
                      >
                        Create folder
                      </button>

                      <button
                        className={styles.dropdownItem}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', node.id);
                        }}
                      >
                        Create note
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.dropdownItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                        sidebarStore.startEditing(`temp-subnote-${Date.now()}`, 'create-subnote', node.id);
                      }}
                    >
                      Create subnote
                    </button>
                  )}

                  <button
                    className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
              </div>
            )}
          </>
        )}
      </div>

      {isExpanded && !collapsed && (
        <div className={styles.treeNodeChildren}>
          {node.children && node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              collapsed={collapsed}
              currentNoteId={currentNoteId}
              onSelectNote={onSelectNote}
            />
          ))}
          {sidebarStore.creatingParentId === node.id && sidebarStore.editingNodeId && sidebarStore.editingNodeId.startsWith('temp-') && (
            <TreeNode
              key={sidebarStore.editingNodeId}
              node={{
                id: sidebarStore.editingNodeId,
                name: '',
                type: sidebarStore.editingMode === 'create-folder' ? 'folder' : 'file',
                parentId: node.id,
              }}
              level={level + 1}
              collapsed={collapsed}
              currentNoteId={currentNoteId}
              onSelectNote={onSelectNote}
            />
          )}
        </div>
      )}
    </div>
  );
});

interface FileSidebarProps {
  currentNoteId?: string;
}

export const FileSidebar: React.FC<FileSidebarProps> = observer(({ currentNoteId }) => {
  const sidebarStore = useSidebarStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentNoteId) {
      sidebarStore.setSelectedNoteId(currentNoteId);
    }
  }, [currentNoteId, sidebarStore]);

  const handleSelectNote = (id: string) => {
    sidebarStore.setSelectedNoteId(id);
    navigate(`/note/${id}`);
  };

  const handleToggleCollapse = () => {
    sidebarStore.toggleCollapse();
  };

  const filteredTree = sidebarStore.getFilteredTree();

  return (
    <aside
      className={cn(
        styles.sidebar,
        sidebarStore.collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      )}
    >
      {/* Header */}
      <div className={styles.header}>
        {!sidebarStore.collapsed ? (
          <div className={styles.headerContent}>
            <FileTextIcon className={cn(styles.icon, styles.iconPrimary)} />
            <span className={styles.headerTitle}>NoteMark</span>
          </div>
        ) : (
          <div className={styles.headerContentCentered}>
            <FileTextIcon className={cn(styles.icon, styles.iconPrimary)} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          className={cn(styles.button, styles.buttonPrimary)}
          title={sidebarStore.collapsed ? 'New Note (Ctrl+N)' : undefined}
        >
          <PlusIcon className={styles.icon} />
          {!sidebarStore.collapsed && <span>New Note</span>}
        </button>

        <button
          className={cn(styles.button, styles.buttonOutline)}
          title={sidebarStore.collapsed ? 'New Folder' : undefined}
        >
          <FolderPlusIcon className={styles.icon} />
          {!sidebarStore.collapsed && <span>New Folder</span>}
        </button>

        {/* <button
          className={cn(styles.button, styles.buttonOutline)}
          title={sidebarStore.collapsed ? 'Upload' : undefined}
        >
          <UploadIcon className={styles.icon} />
          {!sidebarStore.collapsed && <span>Upload</span>}
        </button> */}
      </div>

      {/* Search */}
      {!sidebarStore.collapsed && (
        <div className={styles.search}>
          <div className={styles.searchWrapper}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search..."
              className={styles.searchInput}
              value={sidebarStore.searchQuery}
              onChange={(e) => sidebarStore.setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className={styles.fileTree}>
        <div
          className={styles.fileTreeContent}
          onDragOver={(e) => {
            if (!sidebarStore.canDropToRoot()) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const dragging = sidebarStore.draggingNode;
            if (!dragging || !sidebarStore.canDropToRoot()) return;
            sidebarStore.moveNode(dragging.id, dragging.type, null);
            sidebarStore.stopDragging();

            // дроп в корень: обнуляем parentId (и folderId для заметок)
            if (dragging.type === 'file') {
              $api
                .put(`/notes/${dragging.id}`, { parentId: null, folderId: null })
                .catch((err) => {
                  console.error('Failed to move note to root:', err);
                });
            } else {
              $api
                .put(`/folders/${dragging.id}`, { parentId: null })
                .catch((err) => {
                  console.error('Failed to move folder to root:', err);
                });
            }
          }}
        >
          {filteredTree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              collapsed={sidebarStore.collapsed}
              currentNoteId={currentNoteId}
              onSelectNote={handleSelectNote}
            />
          ))}
        </div>
      </div>

      {/* Quick Links */}
      {/* {!sidebarStore.collapsed && (
        <div className={styles.quickLinks}>
          <button className={cn(styles.button, styles.buttonGhost)}>
            <StarIcon className={styles.icon} />
            <span>Favorites</span>
          </button>
          <button className={cn(styles.button, styles.buttonGhost)}>
            <UsersIcon className={styles.icon} />
            <span>Shared</span>
          </button>
          <button className={cn(styles.button, styles.buttonGhost)}>
            <ClockIcon className={styles.icon} />
            <span>Recent</span>
          </button>
        </div>
      )} */}

      {/* Footer */}
      <div className={styles.footer}>
        {!sidebarStore.collapsed && (
          <button className={cn(styles.button, styles.buttonGhost, styles.footerButton)}>
            <SettingsIcon className={styles.icon} />
            <span>Settings</span>
          </button>
        )}

        <button
          className={cn(styles.button, styles.buttonGhost, styles.collapseButton)}
          onClick={handleToggleCollapse}
          title={sidebarStore.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarStore.collapsed ? (
            <ChevronsRightIcon className={styles.icon} />
          ) : (
            <ChevronsLeftIcon className={styles.icon} />
          )}
        </button>
      </div>
    </aside>
  );
});

