/**
 * Safari / iOS 対応ファイルダウンロード。
 * - Blob URL + download 属性（標準ブラウザ）
 * - iOS Safari / download 非対応時は新規タブで開くフォールバック
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supportsDownload = 'download' in HTMLAnchorElement.prototype;

  try {
    if (isIOS || !supportsDownload) {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.assign(url);
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Download failed');
  }
}

export async function downloadFromResponse(response: Response, filename: string): Promise<void> {
  if (!response.ok) throw new Error('Download failed');
  const blob = await response.blob();
  await downloadBlob(blob, filename);
}
