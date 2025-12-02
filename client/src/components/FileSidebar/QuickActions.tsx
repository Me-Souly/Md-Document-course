import React from 'react';
import { PlusIcon, FolderPlusIcon } from '../icons';
import styles from '../FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface QuickActionsProps {
  collapsed: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ collapsed }) => {
  return (
    <div className={styles.quickActions}>
      <button
        className={cn(styles.button, styles.buttonPrimary)}
        title={collapsed ? 'New Note (Ctrl+N)' : undefined}
      >
        <PlusIcon className={styles.icon} />
        {!collapsed && <span>New Note</span>}
      </button>

      <button
        className={cn(styles.button, styles.buttonOutline)}
        title={collapsed ? 'New Folder' : undefined}
      >
        <FolderPlusIcon className={styles.icon} />
        {!collapsed && <span>New Folder</span>}
      </button>
    </div>
  );
};

