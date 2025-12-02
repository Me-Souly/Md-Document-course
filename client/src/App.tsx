import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import { useAuthStore } from './hooks/useStores';
import { observer } from 'mobx-react-lite';
import { IUser } from './models/IUser';
import UserService from './service/UserService';
import { NoteEditorPage } from './pages/NoteEditorPage';
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

  if(!authStore.isAuth) {
    return (
      <>
        <LoginForm />
        <button onClick={getUsers}>Get User's list</button>
      </>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NoteEditorPage />} />
        <Route path="/note/:noteId" element={<NoteEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default observer(App);