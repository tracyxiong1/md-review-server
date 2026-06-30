import { useCallback, useState, useEffect, useRef } from 'react';

interface FileInfo {
  name: string;
  path: string;
  dir: string;
}

interface FileListData {
  files: FileInfo[];
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  reload: (preferredFile?: string | null) => void;
  loading: boolean;
  error: Error | null;
}

const API_URL = '/api/files';
const FILE_QUERY_PARAM = 'file';

function getFileFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(FILE_QUERY_PARAM);
}

function updateFileInUrl(file: string | null) {
  const url = new URL(window.location.href);
  if (file) {
    url.searchParams.set(FILE_QUERY_PARAM, file);
  } else {
    url.searchParams.delete(FILE_QUERY_PARAM);
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export const useFileList = (): FileListData => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const preferredReloadFileRef = useRef<string | null>(null);

  const reload = useCallback((preferredFile?: string | null) => {
    preferredReloadFileRef.current = preferredFile || null;
    setReloadTrigger((value) => value + 1);
  }, []);

  const selectFile = useCallback((file: string | null) => {
    updateFileInUrl(file);
    setSelectedFile(file);
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const nextFiles = data.files || [];
        const preferredFile = preferredReloadFileRef.current;
        preferredReloadFileRef.current = null;
        setFiles(nextFiles);
        setSelectedFile((currentFile) => {
          if (preferredFile && nextFiles.some((file: FileInfo) => file.path === preferredFile)) {
            updateFileInUrl(preferredFile);
            return preferredFile;
          }
          if (currentFile && nextFiles.some((file: FileInfo) => file.path === currentFile)) {
            return currentFile;
          }
          const urlFile = getFileFromUrl();
          if (urlFile && nextFiles.some((file: FileInfo) => file.path === urlFile)) {
            return urlFile;
          }
          return data.selectedFile || null;
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [reloadTrigger]);

  return { files, selectedFile, setSelectedFile: selectFile, reload, loading, error };
};
