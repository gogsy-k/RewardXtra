import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "CardWiz Privacy Policy — aapka data sirf aapke device pe. Full card number / CVV kabhi nahi.",
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="Last updated: 22 June 2026">
      <p>
        <b>TL;DR —</b> By default aapka saara data <b>sirf aapke device pe</b> rehta hai. Google se
        sign-in optional hai (Cloud Sync ke liye). Hum poora card number / CVV <b>kabhi nahi</b>
        collect karte. Koi tracking, koi ads.
      </p>

      <h2>1. Hum ye KABHI store nahi karte</h2>
      <ul>
        <li>Poora credit/debit card number</li>
        <li>CVV</li>
        <li>Net-banking / bank login credentials</li>
        <li>OTP ya koi payment authentication</li>
      </ul>

      <h2>2. Device pe kya save hota hai</h2>
      <p>Aap jo add karte ho woh browser ke local storage mein save hota hai — sirf is device pe:</p>
      <ul>
        <li>Card ka type/naam aur optional nickname</li>
        <li>Optional last 4 digits (sirf pehchaan ke liye — poora number nahi)</li>
        <li>Bill due date aur reminder preference</li>
        <li>Premium on/off setting</li>
      </ul>

      <h2>3. Account &amp; Cloud Sync (optional)</h2>
      <p>
        Google se sign-in karne pe ek account banta hai (email, naam, Google id, plan). Cloud Sync
        (optional) sirf limited card details — type/naam, nickname, last-4, due date — secure server
        pe sync karta hai taaki kisi bhi browser pe wahi cards milein. Server pe bhi poora card
        number / CVV / bank login <b>kabhi nahi</b> jaata.
      </p>

      <h2>4. Shopping sites pe</h2>
      <p>
        Supported checkout pages pe extension <b>read-only</b> taur pe order amount aur page pe
        dikhaye gaye bank offers padhta hai — best card recommend karne ke liye. Ye jaankari kahin
        transmit nahi hoti. Koi form fill nahi, koi card number enter nahi.
      </p>

      <h2>5. AI Chat (optional)</h2>
      <p>
        Jab aap <b>CardWiz AI</b> (cardwiz.in/ai) use karte ho, aapka type kiya hua sawaal hamare
        server aur hamare AI provider <b>Anthropic (Claude)</b> ko bheja jaata hai taaki jawaab ban
        sake. Logged-in ho to jawaab behtar banane ke liye aapke wallet ke card <i>naam</i> bhi
        context mein ja sakte hain — <b>poora card number, CVV ya koi payment detail kabhi nahi</b>.
        Request hai ki aise sensitive details chat mein type na karein. Yeh feature
        rate-limited hai aur poori tarah optional — na use karein to koi data AI ko nahi jaata.
        AI ke jawaab galti kar sakte hain; important detail bank ki official site pe confirm karein.
      </p>

      <h2>6. Affiliate links</h2>
      <p>
        "Buy via our link" pe link mein hamara affiliate tag add hota hai. Kuch khareedne pe humein
        chhota commission milta hai — <b>aapko koi extra cost nahi</b>. Hum aapki personal jaankari
        affiliate networks ke saath share nahi karte.
      </p>

      <h2>7. Bank logos</h2>
      <p>
        Card ke saath bank ka logo dikhane ke liye hum us bank ka favicon <b>Google ki favicon
        service</b> (kuch cases mein Icon Horse) se load karte hain — us service ko sirf bank ka
        <i>domain</i> dikhta hai, aur koi personal jaankari nahi. Logo na mile to bank ke initials
        (monogram) dikha dete hain.
      </p>

      <h2>8. Data delete</h2>
      <p>
        Extension uninstall karte hi local data delete ho jaata hai. Account/data deletion ke liye{" "}
        <a href="mailto:gurpreetsj8871@gmail.com">humein likho</a>.
      </p>

      <h2>9. Contact</h2>
      <p>
        Sawaal ho to: <a href="mailto:gurpreetsj8871@gmail.com">gurpreetsj8871@gmail.com</a>
      </p>
    </LegalPage>
  );
}
