import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useSidebarStore } from '../hooks/useStores';
import { FileSidebarHeader } from './FileSidebar/FileSidebarHeader';
import { QuickActions } from './FileSidebar/QuickActions';
import { SearchBar } from './FileSidebar/SearchBar';
import { FileTree } from './FileSidebar/FileTree';
import { FileSidebarFooter } from './FileSidebar/FileSidebarFooter';
import { FileTreeNode } from '../types/notes';
import $api from '../http';
import styles from './FileSidebar.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

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

  useEffect(() => {
    const loadSharedNotes = async () => {
      try {
        const res = await $api.get('/notes/shared');
        const sharedData = Array.isArray(res.data) ? res.data : [];
        // Convert shared notes to FileTreeNode format (flat list, no folders)
        const sharedNodes: FileTreeNode[] = sharedData.map((note: any) => ({
          id: note.id,
          name: note.title || 'Untitled',
          type: 'file' as const,
        }));
        sidebarStore.sharedNotes = sharedNodes;
      } catch (err) {
        console.error('Failed to load shared notes:', err);
      }
    };

    loadSharedNotes();
  }, [sidebarStore]);

  const handleSelectNote = (id: string) => {
    sidebarStore.setSelectedNoteId(id);
    navigate(`/note/${id}`);
  };

  const handleToggleCollapse = () => {
    sidebarStore.toggleCollapse();
  };

  return (
    <aside
      className={cn(
        styles.sidebar,
        sidebarStore.collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      )}
    >
      <FileSidebarHeader collapsed={sidebarStore.collapsed} />
      <QuickActions collapsed={sidebarStore.collapsed} />
      <SearchBar />
      <FileTree currentNoteId={currentNoteId} onSelectNote={handleSelectNote} />
      <FileSidebarFooter collapsed={sidebarStore.collapsed} onToggleCollapse={handleToggleCollapse} />
    </aside>
  );
});
