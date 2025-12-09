import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NoteViewer } from '@components/notes/NoteViewer';
import { FileSidebar } from '@components/sidebar/FileSidebar';
import { TopBar } from '@components/common/layout/topbar';
import { HomePage } from './HomePage';
import { ShareModal } from '@components/modals/ShareModal';
import { ActivationBanner } from '@components/modals/ActivationBanner';
import { useAuthStore, useSidebarStore } from '@hooks/useStores';
import $api from '@http';
import * as styles from './NoteEditorPage.module.css';

interface NoteData {
  id: string;
  title: string;
  content?: string;
  rendered?: string;
  ownerId: string;
  isPublic: boolean;
  permission?: 'edit' | 'read' | null;
  access: Array<{
    userId: string;
    permission: 'read' | 'edit';
  }>;
}

export const NoteEditorPage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const sidebarStore = useSidebarStore();
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [noteOwnerInfo, setNoteOwnerInfo] = useState<{ login?: string; name?: string } | null>(null);
  const lastPresenceKeyRef = useRef<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!noteId) {
      // Режим домашнего экрана: заметка не выбрана
      setNote(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Загружаем метаданные заметки
    const loadNote = async () => {
      try {
        const response = await $api.get(`/notes/${noteId}`);
        const noteData = response.data as NoteData;
        
        // Проверяем права доступа
        if (!noteData.permission) {
          setError('У вас нет доступа к этой заметке');
          setLoading(false);
          return;
        }
        
        setNote(noteData);
        
        // Загружаем информацию о владельце заметки
        if (noteData.ownerId) {
          try {
            const ownerResponse = await $api.get(`/users/${noteData.ownerId}`);
            setNoteOwnerInfo({
              login: ownerResponse.data.login,
              name: ownerResponse.data.name || ownerResponse.data.login,
            });
          } catch (ownerError) {
            console.error('Failed to load owner info:', ownerError);
            setNoteOwnerInfo(null);
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to load note';
        // Если 403 или 404 - это проблема доступа
        if (err.response?.status === 403 || err.response?.status === 404) {
          setError('У вас нет доступа к этой заметке');
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      }
    };

    loadNote();
  }, [noteId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let isCancelled = false;

    const loadSidebarData = async () => {
      try {
        const [foldersResponse, notesResponse, usersResponse] = await Promise.all([
          $api.get('/folders'),
          $api.get('/notes'),
          $api.get('/users').catch(() => ({ data: [] })), // Загружаем пользователей, но не критично если не получится
        ]);

        if (isCancelled) return;

        const foldersData = Array.isArray(foldersResponse.data) ? foldersResponse.data : [];
        const notesData = Array.isArray(notesResponse.data) ? notesResponse.data : [];
        const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];

        setUsers(usersData);
        sidebarStore.buildFileTree(foldersData, notesData);

        if (noteId) {
          sidebarStore.setSelectedNoteId(noteId);
          const currentNote = notesData.find((n: any) => n.id === noteId);
          if (currentNote?.folderId) {
            sidebarStore.expandFolderPath(currentNote.folderId);
          }
        }
      } catch (treeError) {
        console.error('Failed to load folders or notes for sidebar:', treeError);
        sidebarStore.setFileTree([]);
      }
    };

    loadSidebarData();

    return () => {
      isCancelled = true;
    };
  }, [noteId, sidebarStore]);

  // Presence: периодически спрашиваем сервер, какие userId сейчас в WS по этой заметке
  useEffect(() => {
    if (!noteId) {
      setOnlineUserIds([]);
      lastPresenceKeyRef.current = '';
      return;
    }

    let cancelled = false;

    const fetchPresence = async () => {
      try {
        const res = await $api.get(`/notes/${noteId}/presence`);
        const ids: string[] = Array.isArray(res.data?.userIds) ? res.data.userIds : [];
        if (!cancelled) {
          // Сериализуем и сравниваем, чтобы не дергать ре-рендеры без изменений
          const key = ids.slice().sort().join(',');
          if (key !== lastPresenceKeyRef.current) {
            lastPresenceKeyRef.current = key;
            setOnlineUserIds(ids);
          }
        }
      } catch (e) {
        // тихо игнорируем, presence не критичен
      }
    };

    // первый запрос сразу
    fetchPresence();
    // и дальше — раз в 5 секунд
    const interval = setInterval(fetchPresence, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [noteId]);

  const token = localStorage.getItem('token');

  if (noteId && loading) {
    return (
      <div className={styles.loading}>
        <p>Загрузка заметки...</p>
      </div>
    );
  }

  // Проверка доступа - если нет permission, не показываем заметку (но только если заметка успешно загружена)
  if (noteId && note && !note.permission) {
    return (
      <div className={styles.errorContainer}>
        <h2 className={styles.errorTitle}>Доступ запрещен</h2>
        <p className={styles.errorMessage}>
          {error || 'У вас нет доступа к этой заметке'}
        </p>
        <button 
          onClick={() => navigate(-1)}
          className={styles.errorButton}
        >
          Назад
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <ActivationBanner />
      <TopBar
        noteTitle={noteId && note ? note.title : undefined}
        breadcrumbs={noteId && note ? ['Home', note.title || 'Untitled Note'] : ['Home']}
        noteOwnerId={noteId && note ? note.ownerId : undefined}
        noteOwnerLogin={noteOwnerInfo?.login}
        noteOwnerName={noteOwnerInfo?.name}
        isPublic={noteId && note ? note.isPublic : false}
        onShareClick={() => {
          if (!authStore.user?.isActivated) {
            return;
          }
          if (noteId && note) {
            setShareModalOpen(true);
          }
        }}
        collaborators={
          noteId && note
            ? note.access?.map(access => {
                // Ищем пользователя в списке загруженных пользователей
                const user = users.find(u => 
                  u.id === access.userId || 
                  u._id === access.userId ||
                  String(u.id) === String(access.userId) ||
                  String(u._id) === String(access.userId)
                );
                
                if (user) {
                  return {
                    id: access.userId,
                    name: user.name || user.login || user.username || `User ${access.userId}`,
                    login: user.login,
                    username: user.username,
                    email: user.email,
                    isOnline: onlineUserIds.includes(access.userId),
                  };
                }
                
                // Если пользователь не найден, используем fallback
                return {
                  id: access.userId,
                  name: `User ${String(access.userId).slice(0, 8)}`,
                  isOnline: onlineUserIds.includes(access.userId),
                };
              }) || []
            : []
        }
      />

      {noteId && note && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          noteId={noteId}
          noteTitle={note.title || 'Untitled Note'}
        />
      )}

      <div className={styles.body}>
        <FileSidebar currentNoteId={noteId && note ? noteId : undefined} />

        <div className={styles.container}>
          <div className={styles.editorContainer}>
            {noteId && note && note.permission ? (
              <NoteViewer
                noteId={noteId}
                permission={note.permission as 'edit' | 'read'}
                getToken={() => localStorage.getItem('token')}
                initialMarkdown={note.rendered || ''}
                ownerId={note.ownerId}
                isPublic={note.isPublic}
              />
            ) : !noteId ? (
              <HomePage />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

