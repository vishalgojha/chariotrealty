package main

import (
	"encoding/json"
	"testing"
)

func TestMessagePayloadMapDecodesRawMessage(t *testing.T) {
	raw := json.RawMessage(`{"extendedTextMessage":{"text":"3 BHK in Bandra West"}}`)
	payload := messagePayloadMap(raw)
	if got := extractMessageText(payload); got != "3 BHK in Bandra West" {
		t.Fatalf("extractMessageText() = %q", got)
	}
}

func TestMessagePayloadMapDecodesJSONBytes(t *testing.T) {
	payload := messagePayloadMap([]byte(`{"conversation":"actual group message"}`))
	if got := extractMessageText(payload); got != "actual group message" {
		t.Fatalf("extractMessageText() = %q", got)
	}
}

func TestMessagePayloadMapRejectsInvalidPayload(t *testing.T) {
	if got := messagePayloadMap("not-json"); got != nil {
		t.Fatalf("messagePayloadMap() = %#v, want nil", got)
	}
}

func TestGroupRawIngestAllowedDropsGroupsByDefault(t *testing.T) {
	t.Setenv("PROPAI_SELF_CHAT_ONLY_BROKERS", "chariot-realty")
	t.Setenv("CHARIOT_WHATSAPP_INGEST_GROUPS", "")

	if groupRawIngestAllowed("chariot-realty") {
		t.Fatal("groupRawIngestAllowed(chariot-realty) = true, want false without an explicit opt-in")
	}
	if !groupRawIngestAllowed("market-broker") {
		t.Fatal("groupRawIngestAllowed(market-broker) = false, want true for brokers that are not self-chat-only")
	}
	if groupRawIngestAllowed("") {
		t.Fatal("groupRawIngestAllowed(\"\") = true, want false for an empty broker id")
	}
}

func TestGroupRawIngestAllowedHonoursBrokerOptIn(t *testing.T) {
	t.Setenv("PROPAI_SELF_CHAT_ONLY_BROKERS", "chariot-realty, other-broker")
	t.Setenv("CHARIOT_WHATSAPP_INGEST_GROUPS", "other-broker, chariot-realty")

	if !groupRawIngestAllowed("chariot-realty") {
		t.Fatal("groupRawIngestAllowed(chariot-realty) = false, want true after opt-in")
	}
	if !groupRawIngestAllowed("other-broker") {
		t.Fatal("groupRawIngestAllowed(other-broker) = false, want true after opt-in")
	}
}

func TestResolveGroupNamePrefersCachedSubject(t *testing.T) {
	groupNameCache.Store("120363000000000000@g.us", "Mumbai Realty Circle")
	t.Cleanup(func() { groupNameCache.Delete("120363000000000000@g.us") })

	if got := resolveGroupName("120363000000000000@g.us"); got != "Mumbai Realty Circle" {
		t.Fatalf("resolveGroupName() = %q, want the cached group subject", got)
	}
}

func TestResolveGroupNameFallsBackToJID(t *testing.T) {
	if got := resolveGroupName("120363999999999999@g.us"); got != "120363999999999999@g.us" {
		t.Fatalf("resolveGroupName() = %q, want the group JID fallback", got)
	}
}
