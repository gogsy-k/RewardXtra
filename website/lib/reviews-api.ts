/*
 * CardWiz Reviews API — client-side helpers.
 * GET is public. POST/DELETE require a session token.
 */
import { BACKEND_URL } from "./api";
import { authedFetch } from "./auth";

export type Review = {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  userPicture: string;
  userPlan: "free" | "premium" | "pro";
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewsResponse = {
  reviews: Review[];
  avgRating: number | null;
  count: number;
};

export async function getReviews(cardId: string): Promise<ReviewsResponse> {
  const empty: ReviewsResponse = { reviews: [], avgRating: null, count: 0 };
  try {
    const res = await fetch(`${BACKEND_URL}/reviews?cardId=${encodeURIComponent(cardId)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return empty;
    return (await res.json()) as ReviewsResponse;
  } catch {
    // Backend hiccup / Render cold-start → fail-soft so the page never crashes (section hides).
    return empty;
  }
}

/** Recent reviews across all cards — pricing-page social proof. */
export async function getRecentReviews(limit = 6): Promise<Review[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/reviews/recent?limit=${limit}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { reviews?: Review[] };
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

export async function postReview(data: {
  cardId: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<Review> {
  const res = await authedFetch("/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.review as Review;
}

export async function deleteReview(cardId: string): Promise<void> {
  const res = await authedFetch(`/reviews/${encodeURIComponent(cardId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
