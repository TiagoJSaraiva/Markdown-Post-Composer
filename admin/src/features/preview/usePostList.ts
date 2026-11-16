import { useEffect, useState } from "react";
import type { PostCard } from "@mdpc/shared/contracts/loadCards.ts";
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

/** Loads the post cards (including inactive ones) the first time the dropdown opens. */
export function usePostList(isOpen: boolean) {
  const { t } = useI18n();
  const password = useAdminPassword();
  const { lockIfUnauthorized } = useAdminAuth();
  const [posts, setPosts] = useState<DropdownPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || hasLoaded) {
      return;
    }

    async function loadCards() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadCardsService(password);

        if (!result.ok) {
          if (!lockIfUnauthorized(result.status)) {
            setError(describeClientFailure(t, result));
          }
          return;
        }

        setPosts(mapCardsToDropdownPosts(result.data));
        setHasLoaded(true);
      } catch {
        setError(t("preview.loadPostsUnexpected"));
      } finally {
        setIsLoading(false);
      }
    }

    void loadCards();
  }, [hasLoaded, isOpen, password, lockIfUnauthorized, t]);

  function removePost(id: string) {
    setPosts((prev) => prev.filter((post) => post.id !== id));
  }

  return { posts, isLoading, error, removePost };
}
