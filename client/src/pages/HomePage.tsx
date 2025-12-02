import React, { useEffect, useMemo, useState } from 'react';
import { NoteCard } from '../components/NoteCard';
import { CustomSelect } from '../components/CustomSelect';
import $api from '../http';
import styles from './HomePage.module.css';
import { GridIcon, ListIcon } from '../components/icons';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-edited' | 'date-created' | 'a-z' | 'z-a';

interface HomeNote {
  id: string;
  title: string;
  rendered?: string;
  excerpt?: string;
  searchableContent?: string;
  updatedAt: string;
  createdAt: string;
  isFavorite?: boolean;
  isShared?: boolean;
}

export const HomePage: React.FC = () => {
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [sharedNotes, setSharedNotes] = useState<HomeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-edited');

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const [ownNotesRes, sharedNotesRes] = await Promise.all([
          $api.get('/notes'),
          $api.get('/notes/shared').catch(() => ({ data: [] })), // Ignore errors for shared notes
        ]);
        
        const ownData = Array.isArray(ownNotesRes.data) ? ownNotesRes.data : [];
        const sharedData = Array.isArray(sharedNotesRes.data) ? sharedNotesRes.data : [];
        
        const mapNote = (n: any): HomeNote => {
          let excerpt = n.meta?.excerpt;
          if (!excerpt && n.meta?.searchableContent) {
            excerpt = n.meta.searchableContent.trim().slice(0, 200);
          }
          
          return {
            id: n.id,
            title: n.title || 'Untitled',
            rendered: n.rendered,
            excerpt: excerpt,
            searchableContent: n.meta?.searchableContent,
            updatedAt: n.updatedAt,
            createdAt: n.createdAt,
            isFavorite: n.meta?.isFavorite ?? false,
            isShared: n.isPublic ?? false,
          };
        };
        
        setNotes(ownData.map(mapNote));
        setSharedNotes(sharedData.map(mapNote));
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, []);

  const sortedNotes = useMemo(() => {
    const copy = [...notes];
    copy.sort((a, b) => {
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case 'date-edited':
          return bUpdated - aUpdated;
        case 'date-created':
          return bCreated - aCreated;
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    return copy;
  }, [notes, sortBy]);

  const recentNotes = sortedNotes.slice(0, 5);
  const favoriteNotes = sortedNotes.filter((n) => n.isFavorite);
  
  // Sort shared notes
  const sortedSharedNotes = useMemo(() => {
    const copy = [...sharedNotes];
    copy.sort((a, b) => {
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();
      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case 'date-edited':
          return bUpdated - aUpdated;
        case 'date-created':
          return bCreated - aCreated;
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
    return copy;
  }, [sharedNotes, sortBy]);

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const renderSection = (title: string, items: HomeNote[]) => {
    if (!items.length) return null;

    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div
          className={
            viewMode === 'grid'
              ? styles.grid
              : styles.list
          }
        >
          {items.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode={viewMode}
              onDelete={() => handleDeleteNote(note.id)}
            />
          ))}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Загрузка заметок…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loading}>
        <p>{error}</p>
      </div>
    );
  }

  if (!notes.length) {
    return (
      <div className={styles.empty}>
        <h1 className={styles.emptyTitle}>Добро пожаловать в NoteMark</h1>
        <p className={styles.emptyText}>
          У вас пока нет заметок. Создайте первую заметку через левое меню.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.homePage}>
      <div className={styles.homeInner}>
        <div className={styles.homeHeader}>
          <h1 className={styles.homeTitle}>Your Notes</h1>
          <div className={styles.homeControls}>
            <div className={styles.viewModeToggle}>
              <button
                className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <GridIcon className={styles.viewModeIcon} />
              </button>
              <button
                className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <ListIcon className={styles.viewModeIcon} />
              </button>
            </div>
            <CustomSelect
              value={sortBy}
              options={[
                { value: 'date-edited', label: 'Date Edited' },
                { value: 'date-created', label: 'Date Created' },
                { value: 'a-z', label: 'A–Z' },
                { value: 'z-a', label: 'Z–A' },
              ]}
              onChange={(value) => setSortBy(value as SortOption)}
            />
          </div>
        </div>

        {renderSection('Recent Notes', recentNotes)}
        {renderSection('Starred', favoriteNotes)}
        {renderSection('Shared with Me', sortedSharedNotes)}
        {renderSection('All Notes', sortedNotes)}
      </div>
    </div>
  );
}


