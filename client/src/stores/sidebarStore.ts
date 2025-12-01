import { makeAutoObservable } from 'mobx';
import RootStore from './RootStore';
import { FileTreeNode } from '../types/notes';

type FolderNodeInput = {
  id: string;
  name?: string;
  title?: string;
  parentId?: string | null;
};

type NoteNodeInput = {
  id: string;
  title?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  isShared?: boolean;
  meta?: Record<string, any>;
};

/**
 * Store для управления sidebar
 * Отвечает за:
 * - Состояние collapsed/expanded
 * - Файловое дерево заметок
 * - Выбранную заметку
 * - Поиск
 */
class sidebarStore {
  rootStore: RootStore;
  
  // Состояние
  collapsed = false;
  fileTree: FileTreeNode[] = [];
  selectedNoteId: string | null = null;
  searchQuery = '';
  expandedFolders: Set<string> = new Set();

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this);
  }

  // Actions
  toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  setCollapsed(collapsed: boolean) {
    this.collapsed = collapsed;
  }

  setFileTree(tree: FileTreeNode[]) {
    this.fileTree = tree;
  }

  setSelectedNoteId(noteId: string | null) {
    this.selectedNoteId = noteId;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  toggleFolder(folderId: string) {
    if (this.expandedFolders.has(folderId)) {
      this.expandedFolders.delete(folderId);
    } else {
      this.expandedFolders.add(folderId);
    }
  }

  isFolderExpanded(folderId: string): boolean {
    return this.expandedFolders.has(folderId);
  }

  // Методы для работы с файловым деревом
  addNode(parentId: string | null, node: FileTreeNode) {
    if (parentId === null) {
      this.fileTree.push(node);
    } else {
      const parent = this.findNodeById(this.fileTree, parentId);
      if (parent && parent.type === 'folder') {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(node);
      }
    }
  }

  deleteNode(nodeId: string) {
    this.fileTree = this.removeNodeById(this.fileTree, nodeId);
    if (this.selectedNoteId === nodeId) {
      this.selectedNoteId = null;
    }
  }

  private findNodeById(nodes: FileTreeNode[], id: string): FileTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private removeNodeById(nodes: FileTreeNode[], id: string): FileTreeNode[] {
    return nodes
      .filter(node => node.id !== id)
      .map(node => {
        if (node.children) {
          return {
            ...node,
            children: this.removeNodeById(node.children, id)
          };
        }
        return node;
      });
  }

  // Построение дерева файлов из списка папок и заметок
  buildFileTree(folders: FolderNodeInput[] = [], notes: NoteNodeInput[] = []) {
    const folderMap = new Map<string, FileTreeNode>();
    const rootNodes: FileTreeNode[] = [];

    // Создаем узлы папок
    folders.forEach((folder) => {
      const parentId = folder.parentId ?? undefined;

      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name || folder.title || 'Folder',
        type: 'folder',
        parentId,
        children: [],
      });
    });

    // Привязываем папки к родителям или корню
    folderMap.forEach((folderNode) => {
      if (folderNode.parentId && folderMap.has(folderNode.parentId)) {
        const parent = folderMap.get(folderNode.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(folderNode);
      } else {
        rootNodes.push(folderNode);
      }
    });

    // Добавляем заметки в соответствующие папки или в корень
    notes.forEach((note) => {
      const fileNode: FileTreeNode = {
        id: note.id,
        name: note.title || 'Untitled',
        type: 'file',
        isFavorite: note.isFavorite ?? note.meta?.isFavorite ?? note.meta?.favorite ?? false,
        isShared: note.isShared ?? note.meta?.isShared ?? false,
      };

      if (note.folderId && folderMap.has(note.folderId)) {
        const parent = folderMap.get(note.folderId)!;
        parent.children = parent.children || [];
        parent.children.push(fileNode);
      } else {
        rootNodes.push(fileNode);
      }
    });

    this.fileTree = rootNodes;

    // Очищаем раскрытые папки, которых больше нет
    this.expandedFolders = new Set(
      Array.from(this.expandedFolders).filter((folderId) => !!this.findNodeById(this.fileTree, folderId))
    );
  }

  expandFolderPath(folderId: string | null | undefined) {
    let currentId = folderId || null;
    while (currentId) {
      this.expandedFolders.add(currentId);
      const folderNode = this.findNodeById(this.fileTree, currentId);
      currentId = folderNode?.parentId ?? null;
    }
  }

  // Фильтрация дерева по поисковому запросу
  getFilteredTree(): FileTreeNode[] {
    if (!this.searchQuery.trim()) {
      return this.fileTree;
    }

    const query = this.searchQuery.toLowerCase();
    return this.filterTree(this.fileTree, query);
  }

  private filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
    const result: FileTreeNode[] = [];

    for (const node of nodes) {
      const matchesQuery = node.name.toLowerCase().includes(query);
      const filteredChildren = node.children ? this.filterTree(node.children, query) : [];

      if (matchesQuery || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        });
      }
    }

    return result;
  }
}

export default sidebarStore;

