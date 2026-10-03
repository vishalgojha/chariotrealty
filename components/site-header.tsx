import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { waLink } from "@/lib/listing";

const INSTAGRAM = "https://instagram.com/chariotrealty.in";

export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="shell public-shell topbar-inner">
        <a className="brand" href="/">
          <span className="brand-logo">
            <img src="/apple-touch-icon.png" alt="Chariot Realty" />
          </span>
          <span>
            <span className="brand-name">
              Chariot <span>Realty</span>
            </span>
            <span className="brand-sub">Bandra · BKC</span>
          </span>
        </a>

        <nav className="topnav" aria-label="Sections">
          <a href="/neighborhoods">Neighborhoods</a>
          <a href="/#opportunities">Listings</a>
          <a href="/about">About</a>
        </nav>

        <div className="header-actions">
          <a className="header-instagram" href={INSTAGRAM} target="_blank" rel="noreferrer" aria-label="Instagram">
            <InstagramIcon size={17} />
          </a>
          <a className="pill pill-dark pill-sm" href={waLink("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
            <WhatsAppIcon size={15} /> WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}
