import { useEffect, useState } from "react";
import type { PostCard } from "@mdpc/shared/contracts/loadCards.ts";
import { usePostDraft } from "../../app/postDraft/postDraftContext";
import { useAdminAuth, useAdminPassword } from "../../auth/authContext";
import { useI18n } from "../../i18n";
import { describeClientFailure } from "../../i18n/errors";
import loadCardsService from "../../services/loadCards";

export type DropdownPost = {
  id: string;
  title: string;
  bannerUrl: string;
  active: boolean;
  preview?: string;
  postType?: string;
};

function mapCardsToDropdownPosts(cards: PostCard[]): DropdownPost[] {
  return cards.map((card) => ({
    id: card.id,
    title: card.title,
    bannerUrl: card.banner_url,
    active: card.active,
    preview: card.preview,
    postType: card.post_type
  }));
}

/** Loads the post cards (including inactive ones) when the dropdown opens and the list is stale. */
export function usePostList(isOpen: boolean) {
  const { t } = useI18n();
  const { postListVersion } = usePostDraft();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [posts, setPosts] = useState<DropdownPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || loadedVersion === postListVersion) {
      return;
    }

    let active = true;

    async function loadCards() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadCardsService(password);
        if (!active) return;

        if (!result.ok) {
          if (!lockIfUnauthorized(result.status)) {
            setError(describeClientFailure(t, result));
          }
          return;
        }

        setPosts(mapCardsToDropdownPosts(result.data));
        setLoadedVersion(postListVersion);
      } catch {
        if (!active) return;
        setError(t("preview.loadPostsUnexpected"));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadCards();

    return () => {
      active = false;
    };
  }, [loadedVersion, postListVersion, isOpen, password, lockIfUnauthorized, t]);

  function removePost(id: string) {
    setPosts((prev) => prev.filter((post) => post.id !== id));
  }

  return { posts, isLoading, error, removePost };
}
