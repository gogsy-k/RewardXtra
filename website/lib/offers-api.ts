import { BACKEND_URL } from "@/lib/api";
import { authedFetch } from "@/lib/auth";

export type Offer = {
  id: string;
  merchant: string;
  bank: string | null;
  cardId: string | null;
  title: string;
  discountText: string;
  validUntil: string | null;
  submittedByEmail?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type SubmitOfferPayload = {
  merchant: string;
  bank?: string;
  cardId?: string;
  title: string;
  discountText: string;
  validUntil?: string;
};

export async function getOffers(params?: { bank?: string; cardId?: string }): Promise<Offer[]> {
  const qs = new URLSearchParams();
  if (params?.bank)   qs.set("bank", params.bank);
  if (params?.cardId) qs.set("cardId", params.cardId);
  try {
    const res = await fetch(`${BACKEND_URL}/offers${qs.size ? "?" + qs : ""}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.offers ?? [];
  } catch {
    // Backend hiccup / Render cold-start → fail-soft so the page never crashes (section hides).
    return [];
  }
}

export async function submitOffer(payload: SubmitOfferPayload): Promise<Offer> {
  const res = await authedFetch("/offers/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status === 429) throw new Error("daily_limit");
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Submit failed");
  }
  const data = await res.json();
  return data.offer;
}

export async function adminGetOffers(status = "pending"): Promise<Offer[]> {
  const res = await authedFetch(`/offers/admin?status=${status}`);
  if (!res.ok) throw new Error("Failed to load");
  const data = await res.json();
  return data.offers ?? [];
}

export async function adminUpdateOffer(id: string, status: "approved" | "rejected"): Promise<Offer> {
  const res = await authedFetch(`/offers/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Update failed");
  const data = await res.json();
  return data.offer;
}
