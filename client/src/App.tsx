import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Auth } from './components/auth/Auth';
import { useAuthStore } from './hooks/useStores';
import { observer } from 'mobx-react-lite';
import { IUser } from './models/IUser';
import UserService from './service/UserService';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ActivationPage } from './pages/ActivationPage';
import { ModeratorDashboard } from './pages/ModeratorDashboard';
import { ToastProvider } from './contexts/ToastContext';
import axios from 'axios';

function App() {
  const authStore = useAuthStore();
  const [users, setUsers] = useState<IUser[]>([]);
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  
  useEffect(() => {
    if(localStorage.getItem('token')) {
      authStore.checkAuth();
    }
  }, [authStore])

  async function getUsers() {
    try {
      const response = await UserService.fetchUsers();
      setUsers(response.data);
    } catch (e) {
      if (axios.isAxiosError(e))
        console.log(e.response?.data?.message);
      else
        console.log(e);     
    }
  }

  if(authStore.isLoading) {
    return <div>Loading ┗|｀O′|┛</div>
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Публичные роуты (доступны без авторизации) */}
          <Route path="/password/reset/:token" element={<ResetPasswordPage />} />
          <Route path="/activate/:token" element={<ActivationPage />} />
          
          {/* Защищенные роуты */}
          {authStore.isAuth ? (
            <>
              <Route path="/" element={<NoteEditorPage />} />
              <Route path="/note/:noteId" element={<NoteEditorPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:userId" element={<PublicProfilePage />} />
              {/* Роут для модераторов */}
              {authStore.user.role === 'moderator' && (
                <Route path="/moderator" element={<ModeratorDashboard />} />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Auth />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default observer(App);