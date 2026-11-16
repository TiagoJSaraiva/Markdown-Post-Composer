import { useCallback, useEffect, useRef, useState } from "react";
import { usePostDraft, type TempImageItem } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeError } from "../../i18n/errors";
import {
  deleteTempImage,
  listTempImages,
  renameTempImage,
  uploadTempImage
} from "../../services/tempImages";
import { stripExtension } from "../../utils/fileNames";

/**
 * State and actions of the temp image list. The list itself lives in the post
 * draft (the editor needs it to validate, preview and save); this hook keeps it
 * in sync with the temp storage of the backend.
 */
export function useTempImages() {
  const { draft, tempReloadToken, updateTempImages } = usePostDraft();
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const items = draft.tempImages;
  const [isLoading, setIsLoading] = useState(false);
  const nextIdRef = useRef(1);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    let active = true;

    async function loadFromTemp() {
      setIsLoading(true);
      try {
        const tempItems = await listTempImages(password);
        if (!active) return;

        const mapped = tempItems.map((item, index) => ({
          id: index + 1,
          name: item.name,
          pendingName: item.name,
          storagePath: item.storagePath,
          publicUrl: item.publicUrl,
          isBusy: false,
          error: null
        }));

        updateTempImages(() => mapped);
        nextIdRef.current = mapped.length + 1;
      } catch (error: unknown) {
        if (!active) return;
        lockIfUnauthorized(error);
        updateTempImages(() => []);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadFromTemp();

    return () => {
      active = false;
    };
  }, [updateTempImages, tempReloadToken, password, lockIfUnauthorized]);

  const patchItem = useCallback((id: number, patch: Partial<TempImageItem>) => {
    updateTempImages((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }, [updateTempImages]);

  const failItem = useCallback((id: number, error: unknown) => {
    if (lockIfUnauthorized(error)) return;
    patchItem(id, { isBusy: false, error: describeError(t, error) });
  }, [lockIfUnauthorized, patchItem, t]);

  function addItem() {
    const id = nextIdRef.current;
    nextIdRef.current += 1;

    updateTempImages((prev) => [
      ...prev,
      {
        id,
        name: "",
        pendingName: "",
        storagePath: null,
        publicUrl: null,
        isBusy: false,
        error: null
      }
    ]);
  }

  async function removeItem(id: number) {
    const item = itemsRef.current.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    if (item.storagePath) {
      patchItem(id, { isBusy: true, error: null });

      try {
        await deleteTempImage(password, item.storagePath);
      } catch (error: unknown) {
        failItem(id, error);
        return;
      }
    }

    updateTempImages((prev) => prev.filter((entry) => entry.id !== id));
  }

  async function pickFile(id: number, file: File | null) {
    if (!file) {
      return;
    }

    patchItem(id, { isBusy: true, error: null });

    try {
      const target = itemsRef.current.find((entry) => entry.id === id);
      const desiredName = target?.pendingName || stripExtension(file.name);

      if (target?.storagePath) {
        await deleteTempImage(password, target.storagePath);
      }

      const uploaded = await uploadTempImage(password, file, desiredName);

      patchItem(id, {
        name: uploaded.name,
        pendingName: uploaded.name,
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        isBusy: false,
        error: null
      });
    } catch (error: unknown) {
      failItem(id, error);
    }
  }

  function changeName(id: number, value: string) {
    patchItem(id, { pendingName: value });
  }

  async function confirmName(id: number) {
    const item = itemsRef.current.find((entry) => entry.id === id);

    if (!item || !item.storagePath || !item.pendingName.trim() || item.pendingName === item.name) {
      return;
    }

    patchItem(id, { isBusy: true, error: null });

    try {
      const renamed = await renameTempImage(password, item.storagePath, item.pendingName);

      patchItem(id, {
        name: renamed.name,
        pendingName: renamed.name,
        storagePath: renamed.storagePath,
        publicUrl: renamed.publicUrl,
        isBusy: false,
        error: null
      });
    } catch (error: unknown) {
      failItem(id, error);
    }
  }

  return { items, isLoading, addItem, removeItem, pickFile, changeName, confirmName };
}
