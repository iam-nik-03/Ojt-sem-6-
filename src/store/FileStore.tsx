import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveFile, getFileFromDB, clearAllFiles, deleteFile } from '../utils/db';

interface FileStoreContextType {
  getFile: (lessonId: string) => Promise<File | undefined>;
  setFiles: (lessonId: string, file: File) => Promise<void>;
  clearFiles: () => Promise<void>;
  deleteFilesForCourse: (lessonIds: string[]) => Promise<void>;
}

const FileStoreContext = createContext<FileStoreContextType | undefined>(undefined);

export const FileStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getFile = async (lessonId: string) => {
    return await getFileFromDB(lessonId);
  };

  const setFiles = async (lessonId: string, file: File) => {
    await saveFile(lessonId, file);
  };

  const clearFiles = async () => {
    await clearAllFiles();
  };

  const deleteFilesForCourse = async (lessonIds: string[]) => {
    for (const id of lessonIds) {
      await deleteFile(id);
    }
  };

  return (
    <FileStoreContext.Provider value={{ getFile, setFiles, clearFiles, deleteFilesForCourse }}>
      {children}
    </FileStoreContext.Provider>
  );
};

export const useFileStore = () => {
  const context = useContext(FileStoreContext);
  if (!context) throw new Error('useFileStore must be used within a FileStoreProvider');
  return context;
};
