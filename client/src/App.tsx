import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Auth } from './components/auth/Auth';
import { useAuthStore } from './hooks/useStores';
import { observer } from 'mobx-react-lite';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ActivationPage } from './pages/ActivationPage';
import { ModeratorDashboard } from './pages/ModeratorDashboard';
import { ToastProvider } from './contexts/ToastContext';
import { Loader } from './components/common/ui';
import { getToken } from './utils/tokenStorage';
import { fetchCsrfToken } from './utils/csrfToken';
import { API_URL } from './http';

// Компонент для защиты роутов
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = observer(({ children }) => {
  const authStore = useAuthStore();
  
  // Редиректим на форму логина, если пользователь не авторизован
  // (инициализация уже завершена на уровне App)
  if (!authStore.isAuth) {
    return <Navigate to="/" replace />;
  }
  
  return children;
});

// Компонент для сохранения текущего роута (без восстановления при перезагрузке)
const RoutePreserver = observer(() => {
  const location = useLocation();
  const isInitialMount = useRef(true);
  
  // Сохраняем текущий роут при каждом изменении (кроме первой загрузки)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Если переходим на главную страницу, очищаем сохраненный роут
    if (location.pathname === '/') {
      sessionStorage.removeItem('lastRoute');
      return;
    }
    
    // Не сохраняем роуты авторизации и активации
    if (!location.pathname.startsWith('/password/reset') && 
        !location.pathname.startsWith('/activate')) {
      sessionStorage.setItem('lastRoute', location.pathname + location.search);
    }
  }, [location]);
  
  return null;
});

function App() {
  const authStore = useAuthStore();
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  useEffect(() => {
    const initialize = async () => {
      // Fetch CSRF token first (needed for all state-changing requests)
      await fetchCsrfToken(API_URL);

      // Then check authentication
      const token = getToken();
      if (token) {
        // Вызываем checkAuth и ждем его завершения
        await authStore.checkAuth();
      }

      setIsInitialized(true);
    };

    initialize();
  }, [authStore])

  // Показываем загрузку, пока идет инициализация
  if(!isInitialized) {
    return <Loader fullScreen variant="spinner" size="lg" text="Загрузка..." />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <RoutePreserver />
        <Routes>
          {/* Публичные роуты (доступны без авторизации) */}
          <Route path="/password/reset/:token" element={<ResetPasswordPage />} />
          <Route path="/activate/:token" element={<ActivationPage />} />
          
          {/* Роут авторизации (для неавторизованных) */}
          {!authStore.isAuth ? (
            <Route path="/" element={<Auth />} />
          ) : (
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <NoteEditorPage />
                </ProtectedRoute>
              }
            />
          )}
          
          {/* Защищенные роуты */}
          <Route
            path="/note/:noteId"
            element={
              <ProtectedRoute>
                <NoteEditorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <ProtectedRoute>
                <PublicProfilePage />
              </ProtectedRoute>
            }
          />
          {/* Роут для модераторов */}
          {authStore.isAuth && authStore.user.role === 'moderator' && (
            <Route
              path="/moderator"
              element={
                <ProtectedRoute>
                  <ModeratorDashboard />
                </ProtectedRoute>
              }
            />
          )}
          
          {/* Catch-all роут */}
          <Route 
            path="*" 
            element={
              authStore.isAuth ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default observer(App);