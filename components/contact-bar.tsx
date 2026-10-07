import { PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { PHONE_DISPLAY, PHONE_TEL, waLink } from "@/lib/listing";

export function ContactBar({ message }: { message?: string }) {
  return (
    <div className="bottom-bar">
      <a className="pill pill-dark" href={waLink(message ?? "Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
        <WhatsAppIcon size={16} /> WhatsApp
      </a>
      <a className="pill pill-outline" href={`tel:${PHONE_TEL}`}>
        <PhoneIcon size={15} /> CALL {PHONE_DISPLAY}
      </a>
    </div>
  );
}
