import React, { useState } from 'react';
import { useAuthStore } from '../hooks/useStores';
import { useToastContext } from '../contexts/ToastContext';
import ActivationService from '../service/ActivationService';
import { observer } from 'mobx-react-lite';
import styles from './ActivationBanner.module.css';

const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ActivationBanner: React.FC = observer(() => {
  const authStore = useAuthStore();
  const toast = useToastContext();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Не показываем баннер, если аккаунт активирован
  if (authStore.user?.isActivated) {
    return null;
  }

  const handleResend = async () => {
    setLoading(true);
    try {
      await ActivationService.resendActivation();
      toast.success('Письмо с активацией отправлено на ваш email');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Ошибка при отправке письма';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckActivation = async () => {
    setChecking(true);
    try {
      // Обновляем данные пользователя, чтобы проверить статус активации
      await authStore.checkAuth();
      if (authStore.user?.isActivated) {
        toast.success('Аккаунт активирован!');
      } else {
        toast.info('Аккаунт еще не активирован. Проверьте email.');
      }
    } catch (error: any) {
      toast.error('Ошибка при проверке статуса активации');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        <div className={styles.bannerIcon}>
          <MailIcon className={styles.icon} />
        </div>
        <div className={styles.bannerText}>
          <h3 className={styles.bannerTitle}>Активируйте ваш аккаунт</h3>
          <p className={styles.bannerDescription}>
            Мы отправили письмо с активацией на <strong>{authStore.user?.email}</strong>.
            Перейдите по ссылке в письме, чтобы активировать аккаунт.
          </p>
        </div>
        <div className={styles.bannerActions}>
          <button
            onClick={handleResend}
            disabled={loading}
            className={styles.button}
          >
            {loading ? (
              <>
                <RefreshIcon className={styles.buttonIcon} />
                Отправка...
              </>
            ) : (
              <>
                <RefreshIcon className={styles.buttonIcon} />
                Отправить повторно
              </>
            )}
          </button>
          <button
            onClick={handleCheckActivation}
            disabled={checking}
            className={styles.button}
          >
            {checking ? (
              <>
                <CheckIcon className={styles.buttonIcon} />
                Проверка...
              </>
            ) : (
              <>
                <CheckIcon className={styles.buttonIcon} />
                Проверить активацию
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

