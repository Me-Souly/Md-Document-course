import React from 'react';
import { PlusIcon, FolderPlusIcon } from '../icons';
import { useSidebarStore } from '../../hooks/useStores';
import styles from '../FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface QuickActionsProps {
  collapsed: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ collapsed }) => {
  const sidebarStore = useSidebarStore();

  const handleCreateNote = () => {
    // Create note in root (no folderId, no parentId)
    sidebarStore.startEditing(`temp-note-${Date.now()}`, 'create-note', null);
  };

  const handleCreateFolder = () => {
    // Create folder in root (no parentId)
    sidebarStore.startEditing(`temp-folder-${Date.now()}`, 'create-folder', null);
  };

  return (
    <div className={styles.quickActions}>
      <button
        className={cn(styles.button, styles.buttonPrimary)}
        title={collapsed ? 'New Note (Ctrl+N)' : undefined}
        onClick={handleCreateNote}
      >
        <PlusIcon className={styles.icon} />
        {!collapsed && <span>New Note</span>}
      </button>

      <button
        className={cn(styles.button, styles.buttonOutline)}
        title={collapsed ? 'New Folder' : undefined}
        onClick={handleCreateFolder}
      >
        <FolderPlusIcon className={styles.icon} />
        {!collapsed && <span>New Folder</span>}
      </button>
    </div>
  );
};

