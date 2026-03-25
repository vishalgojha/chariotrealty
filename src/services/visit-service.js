import { saveConversation } from "./conversation-service.js";
import { updateLeadStatus } from "./lead-service.js";

export async function scheduleSiteVisit(leadPhone, datetime) {
  const updatedLead = await updateLeadStatus(leadPhone, "visit_scheduled");
  await saveConversation({
    phone: leadPhone,
    role: "lead",
    message: `Site visit scheduled for ${datetime}`,
    sender: "agent"
  });

  return {
    ok: true,
    lead_phone: leadPhone,
    datetime,
    status: updatedLead?.status || "visit_scheduled"
  };
}
