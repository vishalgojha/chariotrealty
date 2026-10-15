import { permanentRedirect } from "next/navigation";

export default function BkcLegacyPage() {
  permanentRedirect("/neighborhoods/bkc");
}
