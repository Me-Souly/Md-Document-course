import React, { useState } from 'react';
import { useAuthStore } from '../../hooks/useStores';
import { useToastContext } from '../../contexts/ToastContext';
import { observer } from 'mobx-react-lite';
import styles from './Auth.module.css';

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

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = observer(({ onSwitchToLogin }) => {
  const authStore = useAuthStore();
  const toast = useToastContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
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

    setLoading(true);
    try {
      await authStore.registration(formData.email, formData.username, formData.password);
      // Проверяем, что регистрация действительно прошла успешно
      if (authStore.isAuth) {
        toast.success('Регистрация выполнена успешно');
      } else {
        // Если isAuth не стал true, значит была ошибка
        toast.error('Ошибка регистрации');
      }
    } catch (error: any) {
      // Показываем ошибку (skipErrorToast установлен в AuthService, поэтому interceptor не покажет)
      const errorMessage = error?.response?.data?.message || 'Ошибка регистрации';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>
          <UserPlusIcon className={styles.icon} />
        </div>
        <h1 className={styles.title}>Регистрация</h1>
        <p className={styles.description}>Создайте свой аккаунт</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.cardContent}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              Имя пользователя
            </label>
            <input
              tabIndex={1}
              id="username"
              type="text"
              placeholder="username"
              value={formData.username}
              onChange={handleChange('username')}
              required
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Электронная почта
            </label>
            <input
              tabIndex={2}
              id="email"
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange('email')}
              required
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                tabIndex={3}
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange('password')}
                required
                className={styles.input}
                disabled={loading}
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
            <label htmlFor="confirmPassword" className={styles.label}>
              Подтверждение пароля
            </label>
            <div className={styles.passwordWrapper}>
              <input
                tabIndex={4}
                id="confirmPassword"
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
            tabIndex={5}
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <p className={styles.switchText}>
            Уже есть аккаунт?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className={styles.switchLink}
              disabled={loading}
            >
              Войти
            </button>
          </p>
        </div>
      </form>
    </div>
  );
});

