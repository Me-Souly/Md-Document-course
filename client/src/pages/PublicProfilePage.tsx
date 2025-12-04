import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import $api from '../http';
import { useToastContext } from '../contexts/ToastContext';
import styles from './PublicProfilePage.module.css';
import { FileTextIcon, GridIcon, ListIcon } from '../components/icons';
import { CustomSelect } from '../components/CustomSelect';
import { NoteCard } from '../components/NoteCard';

type SortOption = 'recent' | 'popular' | 'oldest';

interface PublicUser {
  id: string;
  name: string;
  login: string;
  avatarUrl?: string | null;
  about?: string | null;
}

interface PublicNote {
  id: string;
  title: string;
  excerpt?: string;
  rendered?: string;
  searchableContent?: string;
  meta?: {
    excerpt?: string;
    views?: number;
  };
  updatedAt: string;
  createdAt: string;
  isFavorite?: boolean;
  isShared?: boolean;
}

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;

      setLoading(true);
      try {
        // Загружаем всех пользователей и публичные заметки, затем фильтруем по userId
        const [usersRes, publicNotesRes] = await Promise.all([
          $api.get('/users'),
          $api.get('/notes/public'),
        ]);

        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const rawUser = usersData.find((u: any) => u.id === userId || u._id === userId);

        if (!rawUser) {
          setError('User not found');
          setLoading(false);
          return;
        }

        const mappedUser: PublicUser = {
          id: rawUser.id || rawUser._id,
          name: rawUser.name || rawUser.login || 'User',
          login: rawUser.login,
          avatarUrl: rawUser.avatarUrl || null,
          about: rawUser.about || null,
        };

        const publicNotes = Array.isArray(publicNotesRes.data)
          ? publicNotesRes.data
          : [];

        const mappedNotes: PublicNote[] = publicNotes
          .filter((n: any) => n.ownerId && String(n.ownerId) === String(mappedUser.id))
          .map((n: any) => {
            let excerpt = n.meta?.excerpt;
            if (!excerpt && n.meta?.searchableContent) {
              excerpt = n.meta.searchableContent.trim().slice(0, 200);
            }
            
            return {
              id: n.id,
              title: n.title || 'Untitled',
              excerpt: excerpt,
              rendered: n.rendered,
              searchableContent: n.meta?.searchableContent,
              meta: {
                excerpt: excerpt,
                views: n.meta?.views ?? 0,
              },
              updatedAt: n.updatedAt,
              createdAt: n.createdAt,
              isFavorite: n.meta?.isFavorite ?? false,
              isShared: n.isPublic ?? false,
            };
          });

        setUser(mappedUser);
        setNotes(mappedNotes);
        setError(null);
      } catch (e: any) {
        console.error('Failed to load public profile:', e);
        setError(e?.response?.data?.message || 'Failed to load profile');
        toast.error('Не удалось загрузить профиль пользователя');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, toast]);

  const sortedNotes = useMemo(() => {
    const copy = [...notes];
    copy.sort((a, b) => {
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();
      const aViews = a.meta?.views ?? 0;
      const bViews = b.meta?.views ?? 0;

      switch (sortBy) {
        case 'recent':
          return bUpdated - aUpdated;
        case 'popular':
          return bViews - aViews;
        case 'oldest':
          return aUpdated - bUpdated;
        default:
          return 0;
      }
    });
    return copy;
  }, [notes, sortBy]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <span className={styles.headerTitle}>Public profile</span>
        </header>
        <div className={styles.content}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIconCircle}>
              <FileTextIcon className={styles.emptyIcon} />
            </div>
            <h2 className={styles.emptyTitle}>Profile not found</h2>
            <p className={styles.emptyText}>
              The user profile you are looking for does not exist or is unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <span className={styles.headerTitle}>Public profile</span>
      </header>

      <div className={styles.content}>
        {/* Profile header */}
        <section className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatar}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarInitials}>
                  {getInitials(user.name)}
                </span>
              )}
            </div>
            <div className={styles.profileMain}>
              <div className={styles.nameRow}>
                <h1 className={styles.name}>{user.name}</h1>
                <span className={styles.username}>@{user.login}</span>
              </div>
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{sortedNotes.length}</span>
                  <span>public notes</span>
                </div>
              </div>
              {user.about && <p className={styles.bio}>{user.about}</p>}
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() =>
                    toast.info('Follow / unfollow is not implemented yet')
                  }
                >
                  Follow
                </button>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() =>
                    toast.info('Messaging is not implemented yet')
                  }
                >
                  Message
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Public notes */}
        <section>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FileTextIcon className={styles.sectionTitleIcon} />
              <span>{user.name}'s public notes</span>
            </div>
            <div className={styles.controls}>
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
              <div className={styles.sortSelectWrapper}>
                <CustomSelect
                  value={sortBy}
                  options={[
                    { value: 'recent', label: 'Most Recent' },
                    { value: 'popular', label: 'Most Popular' },
                    { value: 'oldest', label: 'Oldest First' },
                  ]}
                  onChange={(value) => setSortBy(value as SortOption)}
                />
              </div>
            </div>
          </div>

          {sortedNotes.length > 0 ? (
            <div className={viewMode === 'grid' ? styles.notesGrid : styles.notesList}>
              {sortedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  viewMode={viewMode}
                  readOnly={true}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconCircle}>
                <FileTextIcon className={styles.emptyIcon} />
              </div>
              <h2 className={styles.emptyTitle}>No public notes yet</h2>
              <p className={styles.emptyText}>
                {user.name} hasn&apos;t shared any public notes yet. Check back later!
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};


