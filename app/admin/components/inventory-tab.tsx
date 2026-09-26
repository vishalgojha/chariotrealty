"use client";

import { FormEvent, ChangeEvent, useCallback, useEffect, useState } from "react";
import { readJson } from "../lib/api";
import { readStoredSession } from "../lib/session";
import type { CmsField, CmsProperty, CmsFieldType } from "../lib/types";
import { FIELD_TYPE_OPTIONS } from "../lib/types";
import type { AdminApi } from "../hooks/use-admin-auth";
import { Note, Panel, PanelHead, Pill } from "./ui";
import type { Notify } from "./whatsapp-tab";

const MARKETS = ["Bandra West", "Bandra East", "BKC", "Khar", "Santacruz"];

const WORKFLOW = [
  { value: "draft", label: "Draft", hint: "Edit & save anytime" },
  { value: "approved", label: "Approve", hint: "Mark as ready to publish" },
  { value: "published", label: "Publish", hint: "Live on the website" },
] as const;

const EMPTY_FORM = {
  id: "",
  slug: "",
  name: "",
  category: "residential",
  locality: "Bandra West",
  micro_market: "Bandra West",
  location: "",
  price: "",
  configuration: "",
  carpet_area_sqft: "",
  image_url: "",
  media_type: "image" as "image" | "video",
  status: "draft" as "draft" | "approved" | "published",
};

const EMPTY_DRAFT = { label: "", field_type: "text" as CmsFieldType, required: false };

export function InventoryTab({ api, notify }: { api: AdminApi; notify: Notify }) {
  const [properties, setProperties] = useState<CmsProperty[]>([]);
  const [fields, setFields] = useState<CmsField[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string | number | boolean>>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadAll = useCallback(async () => {
    const [inventoryResponse, fieldsResponse] = await Promise.all([api.get("/api/inventory?admin=1"), api.get("/api/inventory/fields")]);
    const payload = await readJson(inventoryResponse);
    const fieldsPayload = await readJson(fieldsResponse);
    if (!inventoryResponse.ok) setError(payload.error || "Could not load CMS inventory");
    setProperties(payload.data || []);
    setFields(fieldsPayload.data || []);
    setLoaded(true);
  }, [api]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function addField() {
    if (!draft.label.trim()) return;
    setFieldBusy(true);
    setError("");
    try {
      const response = await api.post("/api/inventory/fields", draft);
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not add field");
      setFields((items) => [...items, payload.data]);
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add field");
    } finally {
      setFieldBusy(false);
    }
  }

  async function createProperty(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...form,
        custom_fields: customValues,
        carpet_area_sqft: form.carpet_area_sqft ? Number(form.carpet_area_sqft) : null,
      };
      const response = editing ? await api.patch(`/api/inventory/${form.id}`, body) : await api.post("/api/inventory", body);
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not save property");
      setProperties((items) =>
        editing ? items.map((item) => (item.id === payload.data.id ? payload.data : item)) : [payload.data, ...items],
      );
      setCustomValues({});
      setForm(EMPTY_FORM);
      setEditing(false);
      notify(editing ? "Draft updated" : form.status === "published" ? "Published to the website" : `Saved as ${form.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save property");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(property: CmsProperty) {
    setEditing(true);
    setCustomValues(property.custom_fields || {});
    setError("");
    setForm({
      id: property.id,
      slug: property.slug,
      name: property.name,
      category: property.category,
      locality: property.locality,
      micro_market: property.micro_market,
      location: property.location,
      price: property.price,
      configuration: property.configuration || "",
      carpet_area_sqft: property.carpet_area_sqft ? String(property.carpet_area_sqft) : "",
      image_url: property.image_url || "",
      media_type: property.media_type || "image",
      status: property.status as "draft" | "approved" | "published",
    });
  }

  function cancelEdit() {
    setEditing(false);
    setCustomValues({});
    setForm(EMPTY_FORM);
    setError("");
  }

  async function removeProperty(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const response = await api.delete(`/api/inventory/${id}`);
    if (!response.ok) {
      const payload = await readJson(response);
      return setError(String(payload.error || "Could not delete property"));
    }
    setProperties((items) => items.filter((item) => item.id !== id));
    if (editing && form.id === id) cancelEdit();
    notify("Deleted");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(`/api/inventory/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${readStoredSession()?.access_token || ""}` },
        body: data,
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not upload image");
       patch({ image_url: payload.public_url, media_type: payload.media_type || "image" });
       notify(payload.media_type === "video" ? "Video uploaded" : "Image uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function setStatus(id: string, status: string) {
    try {
      const response = await api.patch(`/api/inventory/${id}`, { status });
      const payload = await readJson(response);
      if (!response.ok) return setError(payload.error || "Could not update property");
      setProperties((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
      notify(status === "published" ? "Published to the website" : "Property unpublished");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update property");
    }
  }

  function setCustomValue(key: string, type: CmsFieldType, raw: string) {
    if (type === "number") setCustomValues((values) => ({ ...values, [key]: raw === "" ? "" : Number(raw) }));
    else if (type === "boolean") setCustomValues((values) => ({ ...values, [key]: raw === "true" }));
    else setCustomValues((values) => ({ ...values, [key]: raw }));
  }

  const patch = (next: Partial<typeof form>) => setForm((current) => ({ ...current, ...next }));

  return (
    <div className="tab-stack">
      <Panel>
        <PanelHead
          eyebrow="Chariot CMS"
          title="Kapil’s inventory"
          subtitle="Add or edit a property, then move it through the workflow: Draft → Approve → Publish. You can also dictate a property to the Assistant and it will save the draft here."
        />
        <div className="field-builder">
          <div>
            <strong>Custom fields</strong>
            <small>Add fields such as RERA number, furnishing, floor, brokerage or possession.</small>
          </div>
          <div className="field-controls">
            <input
              className="input"
              aria-label="New field label"
              placeholder="Field name (e.g. Furnishing)"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
            <select
              className="select"
              aria-label="New field type"
              value={draft.field_type}
              onChange={(e) => setDraft({ ...draft, field_type: e.target.value as CmsFieldType })}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} /> Required
            </label>
            <button type="button" className="btn btn-light" onClick={addField} disabled={fieldBusy || !draft.label.trim()}>
              {fieldBusy ? "Adding…" : "Add field"}
            </button>
          </div>
          {fields.length > 0 && (
            <div className="field-chips">
              {fields.map((field) => (
                <span key={field.id}>
                  {field.label}
                  <small>{field.field_type}</small>
                </span>
              ))}
            </div>
          )}
        </div>

        <form className="form-grid" onSubmit={createProperty}>
          <div className="workflow">
            <span className="workflow-label">Where should this end up?</span>
            <div className="workflow-steps">
              {WORKFLOW.map((step) => (
                <button
                  type="button"
                  key={step.value}
                  className={`workflow-step${form.status === step.value ? " active" : ""}`}
                  onClick={() => patch({ status: step.value })}
                >
                  <span className="workflow-dot">{WORKFLOW.indexOf(step) + 1}</span>
                  <span>
                    <strong>{step.label}</strong>
                    <small>{step.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Property name</span>
            <input className="input" placeholder="e.g. Ten BKC" value={form.name} onChange={(e) => patch({ name: e.target.value })} required />
          </label>
          <label className="field">
              <span>URL slug (automatic)</span>
              <input className="input" placeholder="Generated from name and locality" value={form.slug} readOnly />
          </label>
          <label className="field">
            <span>Category</span>
            <select className="select" value={form.category} onChange={(e) => patch({ category: e.target.value })}>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="under-construction">New launch</option>
            </select>
          </label>
          <label className="field">
            <span>Price</span>
            <input className="input" placeholder="e.g. ₹2.80L / mo" value={form.price} onChange={(e) => patch({ price: e.target.value })} required />
          </label>
          <label className="field">
            <span>Configuration</span>
            <input className="input" placeholder="e.g. 3 BHK" value={form.configuration} onChange={(e) => patch({ configuration: e.target.value })} />
          </label>
          <label className="field">
            <span>Carpet area (sqft)</span>
            <input className="input" type="number" placeholder="e.g. 1100" value={form.carpet_area_sqft} onChange={(e) => patch({ carpet_area_sqft: e.target.value })} />
          </label>
          <label className="field">
            <span>Locality</span>
            <select className="select" value={form.locality} onChange={(e) => patch({ locality: e.target.value })}>
              {MARKETS.map((market) => <option key={market} value={market}>{market}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Micro-market</span>
            <select className="select" value={form.micro_market} onChange={(e) => patch({ micro_market: e.target.value })}>
              {MARKETS.map((market) => <option key={market} value={market}>{market}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Location</span>
            <input className="input" placeholder="e.g. Kalanagar, Bandra East" value={form.location} onChange={(e) => patch({ location: e.target.value })} required />
          </label>
          <label className="field">
            <span>Image</span>
                 <input className="input" type="url" placeholder="Paste media URL, or upload below" value={form.image_url} onChange={(e) => patch({ image_url: e.target.value })} />
            <small className="field-hint">
              <label className="btn btn-light btn-sm" role="button">
                Upload image
                 <input type="file" accept="image/*,video/*" className="file-input" onChange={uploadImage} disabled={busy} />
              </label>
              {busy && <em> Uploading…</em>}
            </small>
          </label>
          {fields.map((field) => (
            <label className="field" key={field.id}>
              <span>{field.label}</span>
              {field.field_type === "textarea" ? (
                <textarea
                  className="textarea"
                  rows={2}
                  required={field.required}
                  value={String(customValues[field.field_key] ?? "")}
                  onChange={(e) => setCustomValue(field.field_key, field.field_type, e.target.value)}
                />
              ) : field.field_type === "boolean" ? (
                <select
                  className="select"
                  value={String(customValues[field.field_key] ?? "")}
                  onChange={(e) => setCustomValue(field.field_key, field.field_type, e.target.value)}
                >
                  <option value="">—</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  className="input"
                  type={field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : field.field_type === "url" ? "url" : "text"}
                  required={field.required}
                  value={String(customValues[field.field_key] ?? "")}
                  onChange={(e) => setCustomValue(field.field_key, field.field_type, e.target.value)}
                />
              )}
            </label>
          ))}
          <div className="form-submit">
            {editing && (
              <button type="button" className="btn btn-light" onClick={cancelEdit}>Cancel edit</button>
            )}
            <button type="submit" className="btn btn-dark" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : form.status === "published" ? "Save & publish" : form.status === "approved" ? "Save & approve" : "Save draft"}
            </button>
          </div>
        </form>

        {editing && <Note tone="success">Editing this draft. Changes are saved on “Save changes” — the website only changes when it is published.</Note>}
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      <Panel>
        <PanelHead eyebrow="Inventory list" title="Drafts & published" />
        {loaded && !properties.length ? (
          <p className="empty-state">No inventory yet. Create a draft above — or just ask the Assistant to save one — then approve and publish it: that is what shows on the website.</p>
        ) : (
          <div className="row-list">
            {properties.map((property) => (
              <div className="row-item" key={property.id}>
                {property.image_url && (property.media_type === "video" ? <video src={property.image_url} muted playsInline /> : <img src={property.image_url} alt="" />)}
                <div className="row-main">
                  <strong>{property.name}</strong>
                  <small>{property.location}{property.price ? ` · ${property.price}` : ""}</small>
                </div>
                <Pill tone={property.status === "published" ? "live" : "draft"}>{property.status}</Pill>
                <button type="button" className="btn btn-light btn-sm" onClick={() => startEdit(property)}>Edit</button>
                <button type="button" className="btn btn-light btn-sm" onClick={() => removeProperty(property.id, property.name)}>Delete</button>
                {property.status !== "published" ? (
                  <button type="button" className="btn btn-light btn-sm" onClick={() => setStatus(property.id, "published")}>Publish</button>
                ) : (
                  <button type="button" className="btn btn-light btn-sm" onClick={() => setStatus(property.id, "draft")}>Unpublish</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
