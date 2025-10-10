import React, { useContext, useEffect, useState } from 'react';
import LoginForm from './component/LoginForm';
import { Context } from '.';
import { observer } from 'mobx-react-lite';
import { IUser } from './models/IUser';
import UserService from './service/UserService';
import axios from 'axios';

function App() {
  const {store} = useContext(Context);
  const [users, setUsers] = useState<IUser[]>([]);
  
  useEffect(() => {
    if(localStorage.getItem('token')) {
      store.checkAuth();
    }
  }, [store])

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

  if(store.isLoading) {
    return <div>Loading ┗|｀O′|┛</div>
  }

  if(!store.isAuth) {
    return (
      <>
        <LoginForm />
        <button onClick={getUsers}>Get User's list</button>
      </>
    )
  }

  return (
    <div>
      <h1>{`User is authorized: ${store.user.email}`}</h1>
      <h1>{store.user.isActivated ? `User is aactivated` : `Check email and activate account`}</h1>
      <button onClick={() => {
        store.logout();
        setUsers([]);
        }}>
        Logout
      </button>
      <button onClick={getUsers}>Get User's list</button>
      {users.map((user, i) => 
        <div key={user.email}>{user.email}</div>  
      )}
    </div>
  );
}

export default observer(App);