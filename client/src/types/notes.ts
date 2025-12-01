/**
 * Типы для файлового дерева заметок
 */

export interface FileTreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isFavorite?: boolean;
  isShared?: boolean;
  parentId?: string;
}

