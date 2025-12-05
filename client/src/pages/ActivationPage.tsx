import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useStores';
import { useToastContext } from '../contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import styles from './ActivationPage.module.css';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

export const ActivationPage: React.FC = observer(() => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const toast = useToastContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Токен активации не найден');
      return;
    }

    // Активация происходит на сервере при переходе по ссылке из письма
    // Сервер редиректит на /activate/:token, но активация уже выполнена
    // Просто проверяем статус пользователя
    const checkActivation = async () => {
      try {
        // Небольшая задержка, чтобы дать серверу время обработать активацию
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Обновляем данные пользователя
        await authStore.checkAuth();
        
        if (authStore.user?.isActivated) {
          setStatus('success');
          toast.success('Аккаунт успешно активирован!');
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('Активация не удалась. Попробуйте запросить новое письмо.');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error?.response?.data?.message || 'Ошибка при активации аккаунта');
      }
    };

    checkActivation();
  }, [token, authStore, toast, navigate]);

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Активация аккаунта...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckIcon className={styles.checkIcon} />
            </div>
            <h1 className={styles.successTitle}>Аккаунт активирован!</h1>
            <p className={styles.successText}>
              Ваш аккаунт успешно активирован. Вы будете перенаправлены на главную страницу...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>
            <MailIcon className={styles.mailIcon} />
          </div>
          <h1 className={styles.errorTitle}>Ошибка активации</h1>
          <p className={styles.errorText}>{errorMessage}</p>
          <button
            onClick={() => navigate('/')}
            className={styles.backButton}
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
});

