import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ImageRecord, ImageType } from '../lib/inspectionData';
import { imageFileUrl } from '../lib/inspectionData';
import { deleteImage, listImages, uploadImages } from '../lib/inspectionApi';
import { useAuth } from '../hooks/useAuth';

interface ProjectImagesTabProps {
  projectId: string;
}

const IMAGE_TYPES: { value: ImageType; label: string }[] = [
  { value: 'INFRARED', label: '赤外線' },
  { value: 'VISIBLE', label: '可視' },
  { value: 'OVERVIEW', label: '全景' },
];

export function ProjectImagesTab({ projectId }: ProjectImagesTabProps) {
  const { csrfToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [imageType, setImageType] = useState<ImageType>('INFRARED');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const data = await listImages(projectId);
    setImages(data.images);
  }

  useEffect(() => {
    refresh()
      .catch(() => setError('画像一覧の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await uploadImages(projectId, Array.from(files), imageType, csrfToken ?? undefined);
      await refresh();
    } catch {
      setError('アップロードに失敗しました。JPEG/PNG/HEIC のみ対応しています。');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(imageId: string) {
    await deleteImage(projectId, imageId, csrfToken ?? undefined);
    await refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">読み込み中...</p>;

  return (
    <div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <p className="text-sm text-slate-600">JPEG / PNG / HEIC — 最大 20MB / 50枚</p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">画像種別</span>
            <select
              value={imageType}
              onChange={(e) => setImageType(e.target.value as ImageType)}
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2"
            >
              {IMAGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="min-h-11 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading ? 'アップロード中...' : 'ファイルを選択'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <p className="mt-6 text-sm font-medium text-slate-700">
        アップロード済み ({images.length})
      </p>

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">画像がありません</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img
                src={imageFileUrl(projectId, image.id)}
                alt={image.filename}
                className="aspect-video w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-slate-600">{image.filename}</p>
                <p className="text-xs text-slate-400">{image.imageType}</p>
                <div className="flex gap-2">
                  <Link
                    to={`/projects/${projectId}/anomalies/record/${image.id}`}
                    className="min-h-11 flex-1 rounded-lg border border-blue-200 px-2 py-2 text-center text-xs text-blue-700"
                  >
                    異常記録
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="min-h-11 rounded-lg border border-red-200 px-2 py-2 text-xs text-red-600"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
