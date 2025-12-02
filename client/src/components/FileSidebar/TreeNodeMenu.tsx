import React from 'react';
import { FileTreeNode } from '../../types/notes';
import { MoreVerticalIcon } from '../icons';
import { useSidebarStore } from '../../hooks/useStores';
import $api from '../../http';
import styles from '../FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface TreeNodeMenuProps {
  node: FileTreeNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

export const TreeNodeMenu: React.FC<TreeNodeMenuProps> = ({ node, isOpen, onToggle, onClose, onDelete }) => {
  const sidebarStore = useSidebarStore();
  const isFolder = node.type === 'folder';

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    sidebarStore.startEditing(node.id, 'rename');
  };

  const handleCreateFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', node.id);
  };

  const handleCreateNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', node.id);
  };

  const handleCreateSubnote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    sidebarStore.startEditing(`temp-subnote-${Date.now()}`, 'create-subnote', node.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();

    if (!window.confirm(`Are you sure you want to delete "${node.name}"?`)) {
      return;
    }

    try {
      if (isFolder) {
        await $api.delete(`/folders/${node.id}`);
      } else {
        await $api.delete(`/notes/${node.id}`);
      }

      sidebarStore.deleteNode(node.id);
      
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      console.error(`Failed to delete ${isFolder ? 'folder' : 'note'}:`, err);
      alert(`Failed to delete ${isFolder ? 'folder' : 'note'}. Please try again.`);
    }
  };

  return (
    <div className={styles.dropdown}>
      <button
        className={styles.dropdownTrigger}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <MoreVerticalIcon className={styles.iconSmall} />
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <button className={styles.dropdownItem} onClick={handleRename}>
            Rename
          </button>

          {isFolder ? (
            <>
              <button className={styles.dropdownItem} onClick={handleCreateFolder}>
                Create folder
              </button>
              <button className={styles.dropdownItem} onClick={handleCreateNote}>
                Create note
              </button>
            </>
          ) : (
            <button className={styles.dropdownItem} onClick={handleCreateSubnote}>
              Create subnote
            </button>
          )}

          <button
            className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

