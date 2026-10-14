package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/proto/waWeb"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

type Config struct {
	SupabaseURL        string
	SupabaseServiceKey string
	WhatsAppBrokerID   string
	WhatsAppDBPath     string
	DisableHistorySync bool
}

func loadConfig() Config {
	_ = godotenv.Load()
	return Config{
		SupabaseURL:        os.Getenv("SUPABASE_URL"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_KEY"),
		WhatsAppBrokerID:   os.Getenv("WHATSAPP_BROKER_ID"),
		WhatsAppDBPath:     getEnv("WHATSAPP_DB_PATH", "./whatsapp.db"),
		DisableHistorySync: getEnv("DISABLE_HISTORY_SYNC", "false") == "true",
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	cfg := loadConfig()

	if cfg.SupabaseURL == "" || cfg.SupabaseServiceKey == "" || cfg.WhatsAppBrokerID == "" {
		log.Fatal("Missing required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, WHATSAPP_BROKER_ID")
	}

	// Supabase DB connection
	dbURL := cfg.SupabaseURL + "?sslmode=require"
	connConfig, err := pgx.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Parse conn string: %v", err)
	}
	connConfig.ConnectTimeout = 10 * time.Second
	db := stdlib.OpenDB(*connConfig)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(3 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("DB ping: %v", err)
	}
	log.Println("Connected to Supabase")

	// WhatsApp SQLite store for session
	waDB, err := sql.Open("sqlite3", "file:"+cfg.WhatsAppDBPath+"?_foreign_keys=on")
	if err != nil {
		log.Fatalf("WhatsApp SQLite: %v", err)
	}
	defer waDB.Close()

	waStore := sqlstore.NewWithDB(waDB, "sqlite3", waLog.Noop)
	ctx := context.Background()
	if err := waStore.Upgrade(ctx); err != nil {
		log.Fatalf("WhatsApp store upgrade: %v", err)
	}

	device, err := waStore.GetDevice(ctx, types.JID{})
	if err != nil {
		log.Fatalf("Get device: %v", err)
	}

	client := whatsmeow.NewClient(device, waLog.Noop)
	client.EnableAutoReconnect = true

	// Event handler
	client.AddEventHandler(func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			handleMessage(db, cfg.WhatsAppBrokerID, v)
		case *events.HistorySync:
			if !cfg.DisableHistorySync && v.Data != nil {
				log.Printf("History sync received: %d conversations", len(v.Data.GetConversations()))
				handleHistorySync(db, cfg.WhatsAppBrokerID, v)
			}
		case *events.Connected:
			log.Println("WhatsApp connected")
			if !cfg.DisableHistorySync {
				go func() {
					time.Sleep(3 * time.Second)
					req := client.BuildHistorySyncRequest(nil, 50)
					if req != nil {
						ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
						defer cancel()
						_, _ = client.SendPeerMessage(ctx, req)
					}
				}()
			}
		case *events.Disconnected:
			log.Println("WhatsApp disconnected")
		}
	})

	// Connect
	if err := client.Connect(); err != nil {
		log.Fatalf("Connect: %v", err)
	}
	defer client.Disconnect()

	// Keep running
	select {}
}

func handleMessage(db *sql.DB, brokerID string, evt *events.Message) {
	if evt.Message == nil {
		return
	}

	msgText := extractMessage(evt.Message)
	if msgText == "" && evt.Message.GetImageMessage() == nil && evt.Message.GetVideoMessage() == nil {
		return
	}

	senderJID := evt.Info.Sender.String()
	senderPhone := strings.TrimPrefix(evt.Info.Sender.User, "0")

	storeMessage(db, brokerID, map[string]interface{}{
		"broker_id":         brokerID,
		"group_name":        evt.Info.Chat.User,
		"sender":            evt.Info.PushName,
		"sender_jid":        senderJID,
		"sender_phone":      senderPhone,
		"message":           msgText,
		"message_type":      getMessageType(evt.Message),
		"is_group":          evt.Info.IsGroup,
		"message_timestamp": evt.Info.Timestamp,
		"raw_payload":       toRawPayload(evt),
		"message_uid":       fmt.Sprintf("%s:%s", brokerID, evt.Info.ID),
		"event_id":          fmt.Sprintf("%s:%s", brokerID, evt.Info.ID),
		"attachments":       extractAttachments(evt.Message),
		"reply_context":     extractReplyContext(evt.Message),
	})
}

func handleHistorySync(db *sql.DB, brokerID string, evt *events.HistorySync) {
	if evt.Data == nil {
		return
	}
	count := 0
	for _, conv := range evt.Data.GetConversations() {
		if conv == nil {
			continue
		}
		chatID := conv.GetID()
		chatName := strings.TrimSpace(conv.GetName())
		if chatName == "" {
			chatName = strings.TrimSpace(conv.GetDisplayName())
		}

		for _, historyMsg := range conv.GetMessages() {
			if historyMsg == nil || historyMsg.GetMessage() == nil || historyMsg.GetMessage().GetKey() == nil {
				continue
			}

			keyInfo := historyMsg.GetMessage().GetKey()
			messageID := keyInfo.GetID()
			if messageID == "" {
				continue
			}

			remoteJID := keyInfo.GetRemoteJID()
			if remoteJID == "" {
				remoteJID = chatID
			}
			if remoteJID == "status@broadcast" || strings.HasSuffix(remoteJID, "@broadcast") {
				continue
			}

			waMsg := historyMsg.GetMessage().GetMessage()
			if waMsg == nil {
				continue
			}

			msgText := extractMessageFromProto(waMsg)
			if msgText == "" && waMsg.GetImageMessage() == nil && waMsg.GetVideoMessage() == nil {
				continue
			}

			participant := historyMsg.GetMessage().GetParticipant()
			senderID := participant
			fromMe := keyInfo.GetFromMe()
			if senderID == "" && !fromMe {
				senderID = remoteJID
			}

			ts := historyMsg.GetMessage().GetMessageTimestamp()
			if ts == 0 {
				ts = uint64(time.Now().Unix())
			}

			storeMessage(db, brokerID, map[string]interface{}{
				"broker_id":         brokerID,
				"group_name":        chatName,
				"sender":            strings.TrimSpace(historyMsg.GetMessage().GetPushName()),
				"sender_jid":        senderID,
				"sender_phone":      strings.TrimPrefix(senderID, "0"),
				"message":           msgText,
				"message_type":      getMessageTypeFromProto(waMsg),
				"is_group":          strings.HasSuffix(remoteJID, "@g.us"),
				"message_timestamp": time.Unix(int64(ts), 0),
				"raw_payload":       toRawPayloadFromProto(historyMsg.GetMessage()),
				"message_uid":       fmt.Sprintf("%s:%s", brokerID, messageID),
				"event_id":          fmt.Sprintf("%s:%s", brokerID, messageID),
				"attachments":       extractAttachmentsFromProto(waMsg),
				"reply_context":     extractReplyContextFromProto(waMsg),
			})
			count++
		}
	}
	log.Printf("History sync stored %d messages", count)
}

func storeMessage(db *sql.DB, brokerID string, msg map[string]interface{}) {
	rawPayload, _ := json.Marshal(msg["raw_payload"])
	attachments, _ := json.Marshal(msg["attachments"])
	replyContext, _ := json.Marshal(msg["reply_context"])

	_, err := db.Exec(`
		INSERT INTO chariot_whatsapp_messages (
			broker_id, group_name, sender, sender_jid, sender_phone,
			message, message_type, is_group, message_timestamp,
			raw_payload, message_uid, event_id, attachments, reply_context
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		ON CONFLICT (broker_id, message_uid) DO NOTHING
	`, brokerID,
		msg["group_name"],
		msg["sender"],
		msg["sender_jid"],
		msg["sender_phone"],
		msg["message"],
		msg["message_type"],
		msg["is_group"],
		msg["message_timestamp"],
		rawPayload,
		msg["message_uid"],
		msg["event_id"],
		attachments,
		replyContext,
	)

	if err != nil {
		log.Printf("Store message error: %v", err)
	}
}

func extractMessage(msg *waE2E.Message) string {
	if msg.GetConversation() != "" {
		return msg.GetConversation()
	}
	if ext := msg.GetExtendedTextMessage(); ext != nil {
		return ext.GetText()
	}
	return ""
}

func extractMessageFromProto(msg *waE2E.Message) string {
	return extractMessage(msg)
}

func getMessageType(msg *waE2E.Message) string {
	switch {
	case msg.GetImageMessage() != nil:
		return "image"
	case msg.GetVideoMessage() != nil:
		return "video"
	case msg.GetAudioMessage() != nil:
		return "audio"
	case msg.GetDocumentMessage() != nil:
		return "document"
	case msg.GetStickerMessage() != nil:
		return "sticker"
	default:
		return "text"
	}
}

func getMessageTypeFromProto(msg *waE2E.Message) string {
	return getMessageType(msg)
}

func toRawPayload(evt *events.Message) map[string]interface{} {
	b, _ := json.Marshal(evt)
	var m map[string]interface{}
	json.Unmarshal(b, &m)
	return m
}

func toRawPayloadFromProto(msg *waWeb.WebMessageInfo) map[string]interface{} {
	b, _ := json.Marshal(msg)
	var m map[string]interface{}
	json.Unmarshal(b, &m)
	return m
}

func extractAttachments(msg *waE2E.Message) []interface{} {
	var atts []interface{}
	if img := msg.GetImageMessage(); img != nil {
		atts = append(atts, map[string]string{"type": "image", "mime_type": img.GetMimetype()})
	}
	if vid := msg.GetVideoMessage(); vid != nil {
		atts = append(atts, map[string]string{"type": "video", "mime_type": vid.GetMimetype()})
	}
	if aud := msg.GetAudioMessage(); aud != nil {
		atts = append(atts, map[string]string{"type": "audio", "mime_type": aud.GetMimetype()})
	}
	if doc := msg.GetDocumentMessage(); doc != nil {
		atts = append(atts, map[string]string{"type": "document", "mime_type": doc.GetMimetype(), "file_name": doc.GetFileName()})
	}
	return atts
}

func extractAttachmentsFromProto(msg *waE2E.Message) []interface{} {
	return extractAttachments(msg)
}

func extractReplyContext(msg *waE2E.Message) map[string]interface{} {
	if ext := msg.GetExtendedTextMessage(); ext != nil {
		if ci := ext.GetContextInfo(); ci != nil {
			b, _ := json.Marshal(ci)
			var m map[string]interface{}
			json.Unmarshal(b, &m)
			return m
		}
	}
	return map[string]interface{}{}
}

func extractReplyContextFromProto(msg *waE2E.Message) map[string]interface{} {
	return extractReplyContext(msg)
}
