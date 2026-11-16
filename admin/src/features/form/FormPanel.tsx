import { useEffect, useRef } from "react";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import InputLabel from "../../components/InputLabel";
import { getConfig } from "../../config/env";
import { useI18n } from "../../i18n";
import { canConfirmImageName } from "../../utils/draft";
import ImageListItem from "./ImageListItem";
import { useTempImages } from "./useTempImages";
import "./FormPanel.css";

export default function FormPanel() {
  const { draft, setCategory, setTitle, setPreview, setActive, setBanner } = usePostDraft();
  const { t } = useI18n();
  const { categories } = getConfig();
  const { items, isLoading, loadError, addItem, removeItem, pickFile, changeName, confirmName } = useTempImages();
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!draft.banner && bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  }, [draft.banner]);

  // A post being edited may carry a category that is no longer configured.
  const categoryOptions = categories.includes(draft.category) ? categories : [...categories, draft.category];

  return (
    <div className="form-panel">
      <section className="form-panel-top">
        <section className="form-panel-image-list">
          {isLoading ? <div className="form-panel-image-loading">{t("form.loading")}</div> : null}

          {!isLoading && loadError ? <div className="form-panel-image-loading">{loadError}</div> : null}

          {!isLoading
            ? items.map((item) => (
                <ImageListItem
                  key={item.id}
                  id={item.id}
                  isBusy={item.isBusy}
                  hasSelectedFile={Boolean(item.storagePath)}
                  displayName={item.pendingName}
                  canConfirmName={canConfirmImageName(item)}
                  errorText={item.error}
                  onPickFile={(id, file) => void pickFile(id, file)}
                  onChangeName={changeName}
                  onConfirmName={(id) => void confirmName(id)}
                  onRemove={(id) => void removeItem(id)}
                />
              ))
            : null}
        </section>
        <button type="button" className="form-panel-button add_images" onClick={addItem} disabled={isLoading}>{t("form.addImages")}</button>
      </section>

      <section className="form-panel-bottom">
        <InputLabel value={t("form.type")} htmlFor="post-category" />
        <select
          name="type"
          id="post-category"
          multiple={false}
          className="form-panel-select"
          value={draft.category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <InputLabel value={t("form.title")} htmlFor="post-title" />
        <input
          id="post-title"
          type="text"
          className="form-panel-input-text"
          value={draft.title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <InputLabel value={t("form.cardImage")} htmlFor="post-banner" />
        <input
          id="post-banner"
          ref={bannerInputRef}
          type="file"
          className="form-panel-input-file"
          accept="image/*"
          onChange={(event) => setBanner(event.target.files?.[0] ?? null)}
        />

        <InputLabel value={t("form.excerpt")} htmlFor="post-excerpt" />
        <textarea
          id="post-excerpt"
          className="form-panel-preview"
          value={draft.preview}
          onChange={(event) => setPreview(event.target.value)}
        ></textarea>

        <label className="form-panel-active-row" htmlFor="post-active-toggle">
          <InputLabel value={t("form.active")} />
          <input
            id="post-active-toggle"
            type="checkbox"
            className="form-panel-active-checkbox"
            checked={draft.active}
            onChange={(event) => setActive(event.target.checked)}
          />
        </label>
      </section>
    </div>
  );
}
