import React from 'react';
import { FileTextIcon } from '../icons';
import styles from '../FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface FileSidebarHeaderProps {
  collapsed: boolean;
}

export const FileSidebarHeader: React.FC<FileSidebarHeaderProps> = ({ collapsed }) => {
  return (
    <div className={styles.header}>
      {!collapsed ? (
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
  );
};

