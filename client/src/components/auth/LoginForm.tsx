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

const LogInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = observer(({ onSwitchToRegister, onForgotPassword }) => {
  const authStore = useAuthStore();
  const toast = useToastContext();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.emailOrUsername || !formData.password) {
      toast.warning('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await authStore.login(formData.emailOrUsername, formData.password);
      toast.success('Вход выполнен успешно');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Ошибка входа';
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
          <LogInIcon className={styles.icon} />
        </div>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.description}>Войдите в свой аккаунт</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.cardContent}>
          <div className={styles.field}>
            <label htmlFor="emailOrUsername" className={styles.label}>
              Email или Имя пользователя
            </label>
            <input
              id="emailOrUsername"
              type="text"
              placeholder="example@email.com"
              value={formData.emailOrUsername}
              onChange={handleChange('emailOrUsername')}
              required
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="loginPassword" className={styles.label}>
              Пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="loginPassword"
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
            <div className={styles.forgotPassword}>
              <button
                type="button"
                onClick={onForgotPassword}
                className={styles.forgotPasswordLink}
                disabled={loading}
              >
                Забыли пароль?
              </button>
            </div>
          </div>

          <div className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={styles.checkbox}
              disabled={loading}
            />
            <label htmlFor="rememberMe" className={styles.checkboxLabel}>
              Запомнить меня
            </label>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>

          <p className={styles.switchText}>
            Нужен аккаунт?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className={styles.switchLink}
              disabled={loading}
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </form>
    </div>
  );
});

