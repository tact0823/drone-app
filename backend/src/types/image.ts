export type ImageType = 'OVERVIEW' | 'VISIBLE' | 'INFRARED';

export interface ImageRecord {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  imageType: ImageType;
  pairId: string | null;
  direction: string | null;
  createdAt: string;
}

export interface UploadImageInput {
  imageType: ImageType;
  pairId?: string | null;
  direction?: string | null;
}
