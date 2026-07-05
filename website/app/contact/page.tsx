import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the CardWiz team — support, billing, and feedback.",
};

export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-extrabold text-accent">Contact Us</h1>
      <p className="mt-1 text-sm text-subtle">We&apos;d love to hear from you</p>

      <p className="mt-6 leading-relaxed text-subtle">
        Koi question, feedback, billing query, ya Premium ke saath help chahiye? Reach out — hum
        usually 3–5 business days mein reply karte hain.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface2 p-6">
        <div className="text-xs uppercase tracking-wide text-muted">Email</div>
        <div className="mt-1 text-lg">
          <a href="mailto:gurpreetsj8871@gmail.com" className="text-blue hover:underline">
            gurpreetsj8871@gmail.com
          </a>
        </div>

        <div className="mt-5 text-xs uppercase tracking-wide text-muted">Website</div>
        <div className="mt-1 text-lg">
          <a href="https://cardwiz.in" className="text-blue hover:underline">
            cardwiz.in
          </a>
        </div>

        <div className="mt-5 text-xs uppercase tracking-wide text-muted">Support hours</div>
        <div className="mt-1 text-lg text-fg">Mon–Fri, 10:00 AM – 6:00 PM IST</div>
      </div>

      <h2 className="mt-8 text-lg font-bold text-green">Billing &amp; refunds</h2>
      <p className="mt-1 text-sm text-subtle">
        Apna registered email aur payment reference bhejna taaki hum jaldi help kar sakein. Details
        ke liye{" "}
        <a href="/refunds" className="text-blue hover:underline">
          Cancellation &amp; Refunds
        </a>{" "}
        policy dekho.
      </p>
    </div>
  );
}
