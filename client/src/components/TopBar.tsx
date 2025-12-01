import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useStores';
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

  // Формируем breadcrumbs
  const displayBreadcrumbs = breadcrumbs.length > 0 
    ? breadcrumbs 
    : ['Getting Started', noteTitle];

  return (
    <header className={styles.topBar}>
      {/* Left: Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        {displayBreadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
            <span className={cn(
              styles.breadcrumbItem,
              index === displayBreadcrumbs.length - 1 && styles.breadcrumbItemActive
            )}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right: Actions */}
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
                className={cn(styles.avatar, styles.avatarStacked)}
                style={{ marginLeft: index > 0 ? '-8px' : '0' }}
                title={collab.name}
              >
                {collab.avatar ? (
                  <img src={collab.avatar} alt={collab.name} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {getCollaboratorInitials(collab)}
                  </span>
                )}
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

