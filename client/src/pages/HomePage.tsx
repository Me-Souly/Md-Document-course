import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import $api from '../http';
import styles from './HomePage.module.css';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-edited' | 'date-created' | 'a-z' | 'z-a';

interface HomeNote {
  id: string;
  title: string;
  rendered?: string;
  updatedAt: string;
  createdAt: string;
  isFavorite?: boolean;
  isShared?: boolean;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<HomeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date-edited');

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoading(true);
        const res = await $api.get('/notes');
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped: HomeNote[] = data.map((n: any) => ({
          id: n.id,
          title: n.title || 'Untitled',
          rendered: n.rendered,
          updatedAt: n.updatedAt,
          createdAt: n.createdAt,
          isFavorite: n.meta?.isFavorite ?? false,
          isShared: n.isPublic ?? false,
        }));
        setNotes(mapped);
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
  const sharedNotes = sortedNotes.filter((n) => n.isShared);

  const handleOpenNote = (id: string) => {
    navigate(`/note/${id}`);
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
            <div
              key={note.id}
              className={viewMode === 'grid' ? styles.noteCardGrid : styles.noteCardList}
              onClick={() => handleOpenNote(note.id)}
            >
              <h3 className={styles.noteTitle}>{note.title}</h3>
              {note.rendered && (
                <p className={styles.notePreview}>
                  {note.rendered.slice(0, 120)}
                  {note.rendered.length > 120 ? '…' : ''}
                </p>
              )}
              <p className={styles.noteMeta}>
                Updated {new Date(note.updatedAt).toLocaleString()}
              </p>
            </div>
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
            <select
              className={styles.select}
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="date-edited">Date Edited</option>
              <option value="date-created">Date Created</option>
              <option value="a-z">A–Z</option>
              <option value="z-a">Z–A</option>
            </select>
          </div>
        </div>

        {renderSection('Recent Notes', recentNotes)}
        {renderSection('Starred', favoriteNotes)}
        {renderSection('Shared with Me', sharedNotes)}
        {renderSection('All Notes', sortedNotes)}
      </div>
    </div>
  );
}


