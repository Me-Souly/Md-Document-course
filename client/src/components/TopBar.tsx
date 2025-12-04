import React, { useState, useEffect, useRef, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useStores';
import $api from '../http';
import styles from './TopBar.module.css';

// Иконки
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CloudIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const CloudOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    <line x1="1" y1="1" x2="23" y2="23" />
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

// Утилита для объединения классов
const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

// Тип статуса синхронизации
type SyncStatus = 'synced' | 'saving' | 'offline';

interface TopBarProps {
  noteTitle?: string;
  breadcrumbs?: string[];
  onShareClick?: () => void;
  collaborators?: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials?: string;
    isOnline?: boolean;
  }>;
}

export const TopBar: React.FC<TopBarProps> = observer(({ 
  noteTitle = 'Untitled Note',
  breadcrumbs = [],
  onShareClick,
  collaborators = []
}) => {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [myResults, setMyResults] = useState<
    Array<{ id: string; title?: string; meta?: { excerpt?: string; isFavorite?: boolean }; isPublic?: boolean }>
  >([]);
  const [publicResults, setPublicResults] = useState<
    Array<{ id: string; title?: string; meta?: { excerpt?: string; isFavorite?: boolean }; isPublic?: boolean }>
  >([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchDebounceRef = useRef<number | null>(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Поиск заметок с дебаунсом по вводу
  useEffect(() => {
    const query = searchQuery.trim();

    // Если строка пустая — просто скрываем результаты
    if (!query) {
      setMyResults([]);
      setPublicResults([]);
      setShowSearchResults(false);
      setIsOpen(false);
      setFocusedIndex(-1);
      return;
    }

    // Минимальная длина запроса для поиска
    if (query.length < 3) {
      setMyResults([]);
      setPublicResults([]);
      setShowSearchResults(false);
      setIsOpen(true);
      setFocusedIndex(-1);
      return;
    }

    // Очищаем предыдущий таймер
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const [ownRes, publicRes] = await Promise.all([
          ($api.get as any)('/search/notes', {
            params: { query },
            // на неавторизованном клиенте просто игнорируем ошибку
            skipErrorToast: true,
          })
            .catch(() => ({ data: { notes: [] } })),
          ($api.get as any)('/search/notes/public', {
            params: { query },
            skipErrorToast: true,
          })
            .catch(() => ({ data: { notes: [] } })),
        ]);

        const ownNotes =
          (ownRes.data?.notes as Array<{
            id: string;
            title?: string;
            meta?: { excerpt?: string; isFavorite?: boolean };
            isPublic?: boolean;
          }>) || [];

        const pubNotes =
          (publicRes.data?.notes as Array<{
            id: string;
            title?: string;
            meta?: { excerpt?: string; isFavorite?: boolean };
            isPublic?: boolean;
          }>) || [];

        setMyResults(ownNotes);
        setPublicResults(pubNotes);
        setShowSearchResults(true);
        setIsOpen(true);
        setFocusedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  // Закрытие результатов поиска при клике вне поля
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  const allResults = useMemo(
    () => [...myResults, ...publicResults],
    [myResults, publicResults]
  );

  const hasResults = allResults.length > 0;
  const showDropdown = isOpen && searchQuery.trim().length >= 3;

  const handleSelectNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
    setShowSearchResults(false);
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFocusedIndex(-1);
    setIsOpen(false);
    setShowSearchResults(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : allResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < allResults.length) {
          const note = allResults[focusedIndex];
          handleSelectNote(note.id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setShowSearchResults(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  const highlightMatch = (text: string) => {
    const query = searchQuery.trim();
    if (query.length < 3) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className={styles.searchHighlight}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Получение инициалов пользователя
  const getUserInitials = (user: { username?: string; email?: string }): string => {
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Получение инициалов коллаборатора
  const getCollaboratorInitials = (collaborator: { name?: string; initials?: string }): string => {
    if (collaborator.initials) return collaborator.initials;
    if (collaborator.name) {
      return collaborator.name.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const syncIcons = {
    synced: <CloudIcon className={styles.syncIcon} />,
    saving: <CloudIcon className={cn(styles.syncIcon, styles.syncIconPulse)} />,
    offline: <CloudOffIcon className={cn(styles.syncIcon, styles.syncIconError)} />,
  };

  const syncTexts = {
    synced: 'Synced',
    saving: 'Saving...',
    offline: 'Offline',
  };

  const handleSignOut = () => {
    authStore.logout();
    navigate('/');
  };

  return (
    <header className={styles.topBar}>
      {/* Left: Home + Current note */}
      <div className={styles.left}>
        <button
          className={cn(styles.button, styles.buttonGhost, styles.homeButton)}
          onClick={() => navigate('/')}
        >
          <span className={styles.homeIcon}>🏠</span>
          <span className={styles.homeText}>Home</span>
        </button>
        {noteTitle && (
          <>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={cn(styles.breadcrumbItem, styles.breadcrumbItemActive)}>
              {noteTitle}
            </span>
          </>
        )}
      </div>

      {/* Center: Search */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper} ref={searchWrapperRef}>
          <SearchIcon className={styles.searchIconInput} />
          <input
            type="text"
            placeholder="Search notes..."
            className={styles.searchInputTop}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setFocusedIndex(-1);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 3) {
                setIsOpen(true);
                setShowSearchResults(true);
              }
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClearButton}
              onClick={clearSearch}
            >
              ✕
            </button>
          )}
          {showDropdown && (
            <div className={styles.searchResults}>
              {!hasResults ? (
                <div className={styles.searchEmpty}>
                  <SearchIcon className={styles.searchEmptyIcon} />
                  <p className={styles.searchEmptyText}>No results found</p>
                  <p className={styles.searchEmptySubtext}>
                    Try a different search term
                  </p>
                </div>
              ) : (
                <>
                  {myResults.length > 0 && (
                    <div>
                      <div className={styles.searchSectionHeader}>
                        <span className={styles.searchSectionTitle}>My notes</span>
                        <span className={styles.searchSectionCount}>
                          {myResults.length}
                        </span>
                      </div>
                      <div className={styles.searchSectionBody}>
                        {myResults.map((note, index) => (
                          <button
                            key={note.id}
                            type="button"
                            className={cn(
                              styles.searchResultItem,
                              focusedIndex === index && styles.searchResultItemFocused
                            )}
                            onClick={() => handleSelectNote(note.id)}
                          >
                            <div className={styles.searchResultMeta}>
                              <span className={styles.searchResultTitle}>
                                {highlightMatch(note.title || 'Untitled')}
                              </span>
                              {note.meta?.excerpt && (
                                <span className={styles.searchResultExcerpt}>
                                  {highlightMatch(note.meta.excerpt)}
                                </span>
                              )}
                            </div>
                            {note.meta?.isFavorite && (
                              <span className={styles.searchResultStar}>★</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {myResults.length > 0 && publicResults.length > 0 && (
                    <div className={styles.searchSectionDivider} />
                  )}

                  {publicResults.length > 0 && (
                    <div>
                      <div className={styles.searchSectionHeader}>
                        <span className={styles.searchSectionTitle}>
                          Public notes
                        </span>
                        <span className={styles.searchSectionCount}>
                          {publicResults.length}
                        </span>
                      </div>
                      <div className={styles.searchSectionBody}>
                        {publicResults.map((note, index) => {
                          const globalIndex = myResults.length + index;
                          return (
                            <button
                              key={note.id}
                              type="button"
                              className={cn(
                                styles.searchResultItem,
                                focusedIndex === globalIndex &&
                                  styles.searchResultItemFocused
                              )}
                              onClick={() => handleSelectNote(note.id)}
                            >
                              <div className={styles.searchResultMeta}>
                                <span className={styles.searchResultTitle}>
                                  {highlightMatch(note.title || 'Untitled')}
                                </span>
                                {note.meta?.excerpt && (
                                  <span className={styles.searchResultExcerpt}>
                                    {highlightMatch(note.meta.excerpt)}
                                  </span>
                                )}
                              </div>
                              {note.meta?.isFavorite && (
                                <span className={styles.searchResultStar}>★</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {hasResults && (
                    <div className={styles.searchFooter}>
                      <p className={styles.searchFooterText}>
                        <span className={styles.kbd}>↑↓</span> to navigate{' '}
                        <span className={styles.kbd}>↵</span> to select{' '}
                        <span className={styles.kbd}>esc</span> to close
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        {/* Sync Status */}
        <div className={styles.syncStatus}>
          {syncIcons[syncStatus]}
          <span className={styles.syncText}>{syncTexts[syncStatus]}</span>
        </div>

        {/* Share Button */}
        {onShareClick && (
          <button
            className={cn(styles.button, styles.buttonOutline)}
            onClick={onShareClick}
          >
            <ShareIcon className={styles.icon} />
            <span className={styles.buttonText}>Share</span>
          </button>
        )}

        {/* Collaborators */}
        {collaborators.length > 0 && (
          <div className={styles.collaborators}>
            {collaborators.slice(0, 2).map((collab, index) => (
              <div
                key={collab.id}
                className={styles.avatarWrapper}
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
                title={collab.name}
              >
                <div className={cn(styles.avatar, styles.avatarStacked)}>
                  {collab.avatar ? (
                    <img src={collab.avatar} alt={collab.name} />
                  ) : (
                    <span className={styles.avatarFallback}>
                      {getCollaboratorInitials(collab)}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    styles.presenceDot,
                    collab.isOnline ? styles.presenceOnline : styles.presenceOffline
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {/* User Menu */}
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            className={cn(styles.button, styles.buttonGhost, styles.userButton)}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className={styles.avatar}>
              <span className={cn(styles.avatarFallback, styles.avatarFallbackPrimary)}>
                {authStore.user ? getUserInitials(authStore.user) : <UserIcon className={styles.iconSmall} />}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className={styles.dropdownMenu}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/profile');
                }}
              >
                <UserIcon className={styles.iconSmall} />
                <span>Profile</span>
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
              >
                <UsersIcon className={styles.iconSmall} />
                <span>Settings</span>
              </button>
              <div className={styles.dropdownSeparator} />
              <button
                className={cn(styles.dropdownItem, styles.dropdownItemDanger)}
                onClick={handleSignOut}
              >
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

