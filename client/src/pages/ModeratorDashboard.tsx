import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useStores';
import ModeratorService, { PublicNoteForModerator } from '../service/ModeratorService';
import { Modal } from '../components/Modal';
import styles from './ModeratorDashboard.module.css';

const ITEMS_PER_PAGE = 10;

export const ModeratorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const [notes, setNotes] = useState<PublicNoteForModerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<PublicNoteForModerator | null>(null);

  useEffect(() => {
    // Проверка роли модератора
    if (!authStore.isAuth || authStore.user.role !== 'moderator') {
      navigate('/');
      return;
    }

    const loadNotes = async () => {
      try {
        setLoading(true);
        const response = await ModeratorService.getPublicNotes();
        setNotes(response.data);
      } catch (error) {
        console.error('Failed to load public notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [authStore.isAuth, authStore.user.role, navigate]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.author?.name.toLowerCase().includes(query) ||
        note.author?.login.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDeleteClick = (note: PublicNoteForModerator) => {
    setNoteToDelete(note);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (noteToDelete) {
      try {
        await ModeratorService.deleteNote(noteToDelete.id);
        setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));
        setDeleteModalOpen(false);
        setNoteToDelete(null);
        if (paginatedNotes.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.sidebarTitle}>Панель Модератора</h1>
          <p className={styles.sidebarSubtitle}>Moderator Dashboard</p>
        </div>
        <nav className={styles.nav}>
          <Link to="/moderator" className={styles.navItemActive}>
            <span className={styles.navIcon}>📄</span>
            <span>Обзор Публичных Заметок</span>
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <Link to="/" className={styles.backLink}>
            ← Вернуться на главную
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Public Notes Review</h2>
            <p className={styles.subtitle}>
              Просмотр и модерация всех публичных заметок пользователей
            </p>
          </div>

          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Поиск по названию или автору..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeaderRow}>
                  <th className={styles.tableHeader}>ID</th>
                  <th className={styles.tableHeader}>Название</th>
                  <th className={styles.tableHeader}>Автор</th>
                  <th className={styles.tableHeader}>Превью</th>
                  <th className={styles.tableHeader}>Дата</th>
                  <th className={styles.tableHeaderActions}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyCell}>
                      {searchQuery ? 'Заметки не найдены' : 'Нет публичных заметок'}
                    </td>
                  </tr>
                ) : (
                  paginatedNotes.map((note) => (
                    <tr key={note.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <Link
                          to={`/note/${note.id}`}
                          className={styles.noteIdLink}
                        >
                          {note.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className={styles.tableCellTitle}>{note.title}</td>
                      <td className={styles.tableCell}>
                        {note.author ? (
                          <Link
                            to={`/user/${note.author.login}`}
                            className={styles.authorLink}
                          >
                            @{note.author.login}
                          </Link>
                        ) : (
                          <span className={styles.noAuthor}>Неизвестен</span>
                        )}
                      </td>
                      <td className={styles.tableCellPreview}>
                        {note.contentPreview.slice(0, 50)}...
                      </td>
                      <td className={styles.tableCellDate}>
                        {formatDate(note.createdAt)}
                      </td>
                      <td className={styles.tableCellActions}>
                        <button
                          onClick={() => handleDeleteClick(note)}
                          className={styles.deleteButton}
                          title="Удалить заметку"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <p className={styles.paginationInfo}>
                Показано {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredNotes.length)} из{' '}
                {filteredNotes.length} заметок
              </p>
              <div className={styles.paginationControls}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.paginationButton}
                >
                  ← Назад
                </button>
                <span className={styles.paginationPage}>
                  Страница {currentPage} из {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.paginationButton}
                >
                  Далее →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Удалить публичную заметку?"
        message={`Вы уверены, что хотите удалить заметку "${noteToDelete?.title}"?\n\nЭто действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
};

