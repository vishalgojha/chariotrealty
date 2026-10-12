import { permanentRedirect } from "next/navigation";

/** Legacy public URL retained for existing links and search results. */
export default function KharWestLegacyPage() {
  permanentRedirect("/neighborhoods/khar-west");
}
