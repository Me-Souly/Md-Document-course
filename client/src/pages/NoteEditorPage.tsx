import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NoteViewer } from '../components/NoteViewer';
import { FileSidebar } from '../components/FileSidebar';
import { TopBar } from '../components/TopBar';
import { HomePage } from './HomePage';
import { useAuthStore, useSidebarStore } from '../hooks/useStores';
import $api from '../http';
import styles from './NoteEditorPage.module.css';

interface NoteData {
  id: string;
  title: string;
  content?: string;
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
        const [foldersResponse, notesResponse] = await Promise.all([
          $api.get('/folders'),
          $api.get('/notes'),
        ]);

        if (isCancelled) return;

        const foldersData = Array.isArray(foldersResponse.data) ? foldersResponse.data : [];
        const notesData = Array.isArray(notesResponse.data) ? notesResponse.data : [];

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
      <TopBar
        noteTitle={noteId && note ? note.title : undefined}
        breadcrumbs={noteId && note ? ['Home', note.title || 'Untitled Note'] : ['Home']}
        onShareClick={() => {
          // TODO: Реализовать функционал шаринга
          console.log('Share clicked');
        }}
        collaborators={
          noteId && note
            ? note.access?.map(access => ({
                id: access.userId,
                name: `User ${access.userId}`,
                initials: 'U',
              })) || []
            : []
        }
      />

      <div className={styles.body}>
        <FileSidebar currentNoteId={noteId && note ? noteId : undefined} />

        <div className={styles.container}>
          <div className={styles.editorContainer}>
            {noteId && note ? (
              <NoteViewer
                noteId={noteId}
                permission={note.permission as 'edit' | 'read'}
                getToken={() => localStorage.getItem('token')}
              />
            ) : (
              <HomePage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

