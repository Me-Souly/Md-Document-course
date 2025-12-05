import $api from "../http";
import type { AxiosResponse } from "axios";

export interface PublicNoteForModerator {
  id: string;
  title: string;
  ownerId: string;
  author: {
    id: string;
    name: string;
    login: string;
    email: string;
  } | null;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export default class ModeratorService {
  static async getPublicNotes(): Promise<AxiosResponse<PublicNoteForModerator[]>> {
    return $api.get('/moderator/public-notes');
  }

  static async deleteNote(noteId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> {
    return $api.delete(`/moderator/notes/${noteId}`);
  }

  static async blockNote(noteId: string): Promise<AxiosResponse<{ success: boolean; message: string }>> {
    return $api.post(`/moderator/notes/${noteId}/block`);
  }
}

