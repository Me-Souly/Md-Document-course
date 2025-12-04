import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useToastContext } from '../../contexts/ToastContext';
import styles from './Auth.module.css';

type AuthView = 'login' | 'register';

export const Auth: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const toast = useToastContext();

  const handleForgotPassword = () => {
    toast.info('Функция восстановления пароля будет добавлена позже');
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {view === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setView('register')}
            onForgotPassword={handleForgotPassword}
          />
        ) : (
          <RegisterForm onSwitchToLogin={() => setView('login')} />
        )}
      </div>
    </div>
  );
};

