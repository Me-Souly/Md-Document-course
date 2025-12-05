import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PasswordService from '../service/PasswordService';
import { useToastContext } from '../contexts/ToastContext';
import styles from './ResetPasswordPage.module.css';

// Иконки
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Валидация токена при загрузке страницы
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        if (isMounted) {
          setValidating(false);
          setIsValidToken(false);
        }
        return;
      }

      try {
        await PasswordService.validateResetToken(token);
        if (isMounted) {
          setIsValidToken(true);
        }
      } catch (error: any) {
        if (isMounted) {
          const errorMessage = error?.response?.data?.message || 'Недействительный или истекший токен';
          toast.error(errorMessage);
          setIsValidToken(false);
        }
      } finally {
        if (isMounted) {
          setValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]); // Убрал toast из зависимостей

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      toast.warning('Заполните все поля');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 3) {
      toast.error('Пароль должен содержать минимум 3 символа');
      return;
    }

    if (!token) {
      toast.error('Токен не найден');
      return;
    }

    setLoading(true);
    try {
      await PasswordService.resetPassword(token, formData.password);
      setSuccess(true);
      toast.success('Пароль успешно изменен');
      
      // Перенаправляем на страницу входа через 2 секунды
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Ошибка при сбросе пароля';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (validating) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Проверка токена...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>✕</div>
            <h1 className={styles.errorTitle}>Токен недействителен</h1>
            <p className={styles.errorText}>
              Ссылка для сброса пароля недействительна или истекла. Пожалуйста, запросите новую ссылку.
            </p>
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
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckIcon className={styles.checkIcon} />
            </div>
            <h1 className={styles.successTitle}>Пароль успешно изменен</h1>
            <p className={styles.successText}>
              Ваш пароль был успешно изменен. Вы будете перенаправлены на страницу входа...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconWrapper}>
            <LockIcon className={styles.icon} />
          </div>
          <h1 className={styles.title}>Сброс пароля</h1>
          <p className={styles.description}>Введите новый пароль для вашего аккаунта</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.cardContent}>
            <div className={styles.field}>
              <label htmlFor="resetPassword" className={styles.label}>
                Новый пароль
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="resetPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                  className={styles.input}
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  disabled={loading}
                >
                  {showPassword ? <EyeOffIcon className={styles.eyeIcon} /> : <EyeIcon className={styles.eyeIcon} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="resetConfirmPassword" className={styles.label}>
                Подтверждение пароля
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="resetConfirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                  className={styles.input}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.passwordToggle}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOffIcon className={styles.eyeIcon} /> : <EyeIcon className={styles.eyeIcon} />}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Сброс пароля...' : 'Сбросить пароль'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className={styles.cancelButton}
              disabled={loading}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

