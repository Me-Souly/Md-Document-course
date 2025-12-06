import React, { useState, useEffect } from 'react';
import { useToastContext } from '../contexts/ToastContext';
import { useAuthStore } from '../hooks/useStores';
import { CustomSelect } from './CustomSelect';
import { MailIcon, XIcon, CopyIcon, GlobeIcon } from './icons';
import $api from '../http';
import styles from './ShareModal.module.css';

const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ');

interface Collaborator {
  userId: string;
  name: string;
  email: string;
  permission: 'read' | 'edit';
  isOwner?: boolean;
}

interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  login?: string;
  username?: string;
}

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ open, onOpenChange, noteId, noteTitle }) => {
  const toast = useToastContext();
  const authStore = useAuthStore();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'read' | 'edit'>('edit');
  const [linkSharing, setLinkSharing] = useState(false);
  const [linkPermission, setLinkPermission] = useState<'read' | 'edit'>('read');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open && noteId) {
      loadUsers().then(() => {
        loadAccessList();
      });
    }
  }, [open, noteId]);

  useEffect(() => {
    if (open && users.length > 0) {
      loadAccessList();
    }
  }, [users]);

  const loadAccessList = async () => {
    try {
      const res = await $api.get(`/notes/${noteId}/access`);
      const accessList = res.data || [];
      
      // Map access list to collaborators
      const collabs: Collaborator[] = [];
      
      // Add owner
      if (authStore.user?.id) {
        collabs.push({
          userId: authStore.user.id,
          name: authStore.user.username || 'You',
          email: authStore.user.email || '',
          permission: 'edit',
          isOwner: true,
        });
      }

      // Load user details for each access entry
      for (const access of accessList) {
        // Try to get user info from users list or use placeholder
        const user = users.find(u => u.id === access.userId || u.id === access.userId?.toString());
        
        if (user) {
          collabs.push({
            userId: access.userId,
            name: user.name || `User ${access.userId}`,
            email: user.email || '',
            permission: access.permission,
          });
        } else {
          // Use placeholder if user not found
          collabs.push({
            userId: access.userId,
            name: `User ${String(access.userId).slice(0, 8)}`,
            email: '',
            permission: access.permission,
          });
        }
      }

      setCollaborators(collabs);
    } catch (err: any) {
      console.error('Failed to load access list:', err);
      toast.error('Не удалось загрузить список доступа');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await $api.get('/users');
      const usersData = Array.isArray(res.data) ? res.data : [];
      // Normalize user data - handle both DTO format and raw model format
      const normalizedUsers = usersData.map((user: any) => ({
        id: user.id || user._id?.toString() || user._id,
        name: user.name || user.username || user.login || '',
        email: user.email || '',
        login: user.login || user.username || '',
      }));
      setUsers(normalizedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const searchUsers = (query: string) => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return users.filter(
      (user) =>
        user.email?.toLowerCase().includes(lowerQuery) ||
        user.name?.toLowerCase().includes(lowerQuery) ||
        user.login?.toLowerCase().includes(lowerQuery) ||
        user.username?.toLowerCase().includes(lowerQuery)
    );
  };

  const handleInvite = async () => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы приглашать пользователей');
      return;
    }

    if (!inviteEmail.trim()) {
      toast.warning('Введите email или имя пользователя');
      return;
    }

    const foundUsers = searchUsers(inviteEmail);
    if (foundUsers.length === 0) {
      toast.error('Пользователь не найден');
      return;
    }

    if (foundUsers.length > 1) {
      toast.warning('Найдено несколько пользователей. Уточните запрос.');
      return;
    }

    const userToInvite = foundUsers[0];
    const userId = userToInvite.id;
    
    if (!userId) {
      toast.error('Не удалось определить ID пользователя');
      console.error('User to invite:', userToInvite);
      return;
    }
    
    // Check if user is already a collaborator
    if (collaborators.some(c => c.userId === userId || c.userId === userId.toString())) {
      toast.warning('Пользователь уже имеет доступ');
      return;
    }

    setLoading(true);
    try {
      await $api.post(`/notes/${noteId}/access`, {
        userId: userId,
        permission: invitePermission,
      });
      
      toast.success(`Доступ предоставлен ${userToInvite.name || userToInvite.email}`);
      setInviteEmail('');
      loadAccessList();
    } catch (err: any) {
      console.error('Failed to add access:', err);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы управлять доступом');
      return;
    }

    if (userId === authStore.user?.id) {
      toast.warning('Нельзя удалить владельца');
      return;
    }

    setLoading(true);
    try {
      await $api.delete(`/notes/${noteId}/access/${userId}`);
      toast.success('Доступ удалён');
      loadAccessList();
    } catch (err: any) {
      console.error('Failed to remove access:', err);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (userId: string, newPermission: 'read' | 'edit') => {
    if (!authStore.user?.isActivated) {
      toast.warning('Активируйте аккаунт, чтобы управлять доступом');
      return;
    }

    setLoading(true);
    try {
      await $api.patch(`/notes/${noteId}/access/${userId}`, {
        permission: newPermission,
      });
      toast.success('Права доступа обновлены');
      loadAccessList();
    } catch (err: any) {
      console.error('Failed to update permission:', err);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/note/${noteId}`;
    navigator.clipboard.writeText(link);
    toast.success('Ссылка скопирована');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (!open) return null;

  const filteredUsers = searchUsers(inviteEmail);

  return (
    <div className={styles.overlay} onClick={() => onOpenChange(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Share "{noteTitle}"</h2>
          <button className={styles.closeButton} onClick={() => onOpenChange(false)}>
            <XIcon className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Invite by Email */}
          <div className={styles.section}>
            <label className={styles.label}>Пригласить по email</label>
            <div className={styles.inviteRow}>
              <div className={styles.inputWrapper}>
                <MailIcon className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Введите email или имя"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInvite();
                    }
                  }}
                />
                {inviteEmail && filteredUsers.length > 0 && (
                  <div className={styles.userSuggestions}>
                    {filteredUsers.slice(0, 5).map((user) => (
                      <button
                        key={user.id}
                        className={styles.userSuggestion}
                        onClick={() => {
                          setInviteEmail(user.email || user.name || '');
                        }}
                      >
                        <div className={styles.userSuggestionAvatar}>
                          {getInitials(user.name || user.email || 'U')}
                        </div>
                        <div className={styles.userSuggestionInfo}>
                          <div className={styles.userSuggestionName}>{user.name}</div>
                          <div className={styles.userSuggestionEmail}>{user.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <CustomSelect
                value={invitePermission}
                options={[
                  { value: 'read', label: 'View' },
                  { value: 'edit', label: 'Edit' },
                ]}
                onChange={(value) => setInvitePermission(value as 'read' | 'edit')}
              />
              <button
                className={cn(styles.button, styles.buttonPrimary)}
                onClick={handleInvite}
                disabled={loading || !inviteEmail.trim()}
              >
                Пригласить
              </button>
            </div>
          </div>

          {/* Current Collaborators */}
          <div className={styles.section}>
            <label className={styles.label}>Люди с доступом</label>
            <div className={styles.collaboratorsList}>
              {collaborators.map((collab) => (
                <div key={collab.userId} className={styles.collaborator}>
                  <div className={styles.collaboratorAvatar}>
                    {getInitials(collab.name)}
                  </div>
                  <div className={styles.collaboratorInfo}>
                    <div className={styles.collaboratorName}>{collab.name}</div>
                    <div className={styles.collaboratorEmail}>{collab.email || collab.userId}</div>
                  </div>
                  <CustomSelect
                    value={collab.permission}
                    options={[
                      { value: 'read', label: 'View' },
                      { value: 'edit', label: 'Edit' },
                    ]}
                    onChange={(value) => {
                      if (!collab.isOwner) {
                        handleUpdatePermission(collab.userId, value as 'read' | 'edit');
                      }
                    }}
                  />
                  {!collab.isOwner && (
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveCollaborator(collab.userId)}
                      disabled={loading}
                    >
                      <XIcon className={styles.removeIcon} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Link Sharing */}
          <div className={cn(styles.section, styles.linkSection)}>
            <div className={styles.linkHeader}>
              <div>
                <label className={styles.label}>Публичная ссылка</label>
                <p className={styles.description}>
                  Любой с этой ссылкой может получить доступ
                </p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={linkSharing}
                  onChange={(e) => setLinkSharing(e.target.checked)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {linkSharing && (
              <div className={styles.linkContent}>
                <div className={styles.linkInputWrapper}>
                  <GlobeIcon className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.input}
                    value={`${window.location.origin}/note/${noteId}`}
                    readOnly
                  />
                  <button className={styles.copyButton} onClick={copyLink}>
                    <CopyIcon className={styles.copyIcon} />
                    Копировать
                  </button>
                </div>
                <CustomSelect
                  value={linkPermission}
                  options={[
                    { value: 'read', label: 'Только просмотр' },
                    { value: 'edit', label: 'Редактирование' },
                  ]}
                  onChange={(value) => setLinkPermission(value as 'read' | 'edit')}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={cn(styles.button, styles.buttonOutline)}
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </button>
          <button
            className={cn(styles.button, styles.buttonPrimary)}
            onClick={() => onOpenChange(false)}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

