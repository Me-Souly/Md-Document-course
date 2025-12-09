import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobeIcon, UserIcon } from '@components/common/ui/icons';
import * as styles from '../NoteViewer.module.css';

interface EditorBottomBarProps {
  wordCount: number;
  isPublic?: boolean;
  ownerInfo?: { login?: string; name?: string } | null;
  ownerId?: string;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
  wordCount,
  isPublic = false,
  ownerInfo,
  ownerId,
}) => {
  const navigate = useNavigate();

  return (
    <div className={styles.bottomBar}>
      <div className={styles.bottomBarLeft}>
        <span>{wordCount} words</span>
        <span className={styles.bottomBarSeparator}>•</span>
        <span className={styles.bottomBarEditable}>You can edit</span>
        {isPublic && (
          <>
            <span className={styles.bottomBarSeparator}>•</span>
            <span className={styles.publicBadge} title="Public note">
              <GlobeIcon className={styles.publicIcon} />
              <span>Public</span>
            </span>
          </>
        )}
        {ownerInfo && (
          <>
            <span className={styles.bottomBarSeparator}>•</span>
            <button
              className={styles.ownerButton}
              onClick={() => {
                const identifier = ownerInfo.login || ownerId;
                navigate(`/user/${identifier}`);
              }}
              title={`View ${ownerInfo.name || ownerInfo.login}'s profile`}
            >
              <UserIcon className={styles.ownerIcon} />
              <span>{ownerInfo.name || ownerInfo.login}</span>
            </button>
          </>
        )}
      </div>
      <div className={styles.bottomBarRight}>
        <span className={styles.autoSaved}>
          <span className={styles.autoSavedDot}></span>
          Auto-saved
        </span>
      </div>
    </div>
  );
};

