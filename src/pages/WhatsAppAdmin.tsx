import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, LogOut, MessageCircle, Send, Settings2, FileText, Users, Megaphone, MessagesSquare, Activity } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppInbox } from "@/components/WhatsAppInbox";

type Tab = "overview" | "configuration" | "templates" | "contacts" | "campaigns" | "messages" | "webhook";
type AdminResult = Record<string, unknown>;
interface HealthResult {
  apiConnected: boolean;
  phoneNumberConfigured: boolean;
  phoneNumberVerified: boolean;
  businessAccountConfigured: boolean;
  webhookConfigured: boolean;
  webhookReachable: boolean;
  apiVersionValid: boolean;
  approvedTemplateCount: number;
  databaseReady: boolean;
  workerSecretConfigured: boolean;
  workerRecentlyActive: boolean;
  configurationComplete: boolean;
  workerLastStatus: string | null;
  workerLastRunAt: string | null;
  missing: string[];
  apiError: { message?: string; type?: string } | null;
}
interface TemplateComponent { type: string }
interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  components: TemplateComponent[];
}
interface WhatsAppContact {
  id: string;
  name: string;
  business_type: string;
  city: string;
  whatsapp: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  whatsapp_opt_in_source: string | null;
  whatsapp_opt_out: boolean;
  whatsapp_opt_out_at: string | null;
}
interface ContactPage { contacts: WhatsAppContact[]; total: number; pageSize: number }
interface Campaign {
  campaign_id: string;
  name: string;
  campaign_status: string;
  created_at: string;
  total_recipients: number;
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number | null;
  read_rate: number | null;
}
interface WhatsAppMessage {
  id: string;
  created_at: string;
  direction: string;
  recipient_phone: string;
  message_type: string;
  meta_message_id: string | null;
  status: string;
  error_metadata: { message?: string; errors?: { title?: string }[] };
}
interface WebhookEvent {
  id: string;
  received_at: string;
  event_type: string;
  meta_message_id: string | null;
  message_status: string | null;
  event_timestamp: string | null;
}
interface AdminData {
  health?: HealthResult;
  templates?: WhatsAppTemplate[];
  contacts?: WhatsAppContact[];
  contactResult?: ContactPage;
  campaigns?: Campaign[];
  messages?: WhatsAppMessage[];
  events?: WebhookEvent[];
}

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "configuration", label: "Configuration", icon: Settings2 },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "messages", label: "Messages", icon: MessagesSquare },
  { id: "webhook", label: "Webhook Status", icon: MessageCircle },
];

async function invokeAdmin(action: string, payload: Record<string, unknown> = {}): Promise<AdminResult> {
  const { data, error } = await supabase.functions.invoke("whatsapp-service", { body: { action, ...payload } });
  if (error) throw new Error(error.message || "The WhatsApp service could not be reached");
  if (!data?.success) throw new Error(data?.error || "The WhatsApp operation failed");
  return data;
}

function StatusPill({ children }: { children: string }) {
  const good = ["Connected", "Reachable", "Configured", "Ready", "Active", "APPROVED", "sent", "delivered", "read", "received", "completed"].includes(children);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${good ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{children}</span>;
}

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function WhatsAppAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<AdminData>({});
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactPage, setContactPage] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [campaignName, setCampaignName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [componentJson, setComponentJson] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: result }) => {
      setSession(result.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = session?.user?.app_metadata?.role === "admin";

  const load = useCallback(async (target = tab) => {
    if (!isAdmin) return;
    setLoading(true);
    setActionError("");
    try {
      if (target === "overview" || target === "campaigns") {
        const [campaignResult, healthResult, contactResult, templateResult] = await Promise.all([
          invokeAdmin("list_campaigns"),
          target === "overview" ? invokeAdmin("health") : Promise.resolve(null),
          target === "campaigns" ? invokeAdmin("list_contacts", { page: contactPage }) : Promise.resolve(null),
          target === "campaigns" ? invokeAdmin("list_templates") : Promise.resolve(null),
        ]);
        setData((current) => ({
          ...current,
          campaigns: (campaignResult.campaigns as Campaign[] | undefined) || [],
          ...(healthResult ? { health: healthResult as HealthResult } : {}),
          ...(contactResult ? { contactResult: contactResult as unknown as ContactPage } : {}),
          ...(templateResult ? { templates: (templateResult.templates as WhatsAppTemplate[] | undefined) || [] } : {}),
        }));
      } else if (target === "configuration" || target === "webhook") {
        const [healthResult, eventsResult] = await Promise.all([
          invokeAdmin("health"),
          target === "webhook" ? invokeAdmin("list_webhook_events") : Promise.resolve(null),
        ]);
        setData((current) => ({ ...current, health: healthResult as unknown as HealthResult, ...(eventsResult ? { events: (eventsResult.events as WebhookEvent[] | undefined) || [] } : {}) }));
      } else if (target === "templates") {
        const result = await invokeAdmin("list_templates");
        setData((current) => ({ ...current, templates: (result.templates as WhatsAppTemplate[] | undefined) || [] }));
      } else if (target === "contacts") {
        const result = await invokeAdmin("list_contacts", { page: contactPage });
        setData((current) => ({ ...current, contactResult: result as unknown as ContactPage }));
      } else if (target === "messages") {
        const result = await invokeAdmin("list_messages");
        setData((current) => ({ ...current, messages: (result.messages as WhatsAppMessage[] | undefined) || [] }));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not load WhatsApp data");
    } finally {
      setLoading(false);
    }
  }, [tab, isAdmin, contactPage]);

  useEffect(() => {
    if (isAdmin) void load(tab);
  }, [isAdmin, tab, contactPage, load]);

  const runAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setActionError("");
    try {
      const result = await invokeAdmin(action, payload);
      await load(tab);
      return result;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The action failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError("Sign-in failed. Check your credentials and try again.");
    setLoginBusy(false);
  };

  const eligibleTemplates = useMemo(() => (data.templates || []).filter((template) => template.status === "APPROVED"), [data.templates]);
  const contactResult = data.contactResult || { contacts: [], total: 0, page: 0, pageSize: 100 };
  const contacts = contactResult.contacts || [];

  const submitCampaign = async (event: FormEvent) => {
    event.preventDefault();
    let components: unknown = [];
    if (componentJson.trim()) {
      try {
        components = JSON.parse(componentJson);
      } catch {
        setActionError("Template component values must be valid JSON.");
        return;
      }
    }
    const result = await runAction("create_campaign", {
      name: campaignName,
      templateId,
      contactIds: [...selectedContacts],
      components,
    });
    if (result) {
      setCampaignName("");
      setTemplateId("");
      setComponentJson("");
      setSelectedContacts(new Set());
      setActionError(`${result.queued} recipient(s) queued; ${result.failed} could not be sent because their number is invalid. The scheduled worker sends queued messages.`);
    }
  };

  if (authLoading) return <main className="min-h-screen bg-background p-8 text-muted-foreground">Loading admin session…</main>;

  if (!session) {
    return (
      <main className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
          <Link to="/" className="text-sm text-primary">← SwiftGrowthDigital</Link>
          <div className="mt-8 flex items-center gap-3">
            <div className="rounded-xl bg-whatsapp p-3 text-white"><MessageCircle className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-bold">WhatsApp Admin</h1><p className="text-sm text-muted-foreground">Sign in with an administrator account.</p></div>
          </div>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            {loginError && <p role="alert" className="text-sm text-destructive">{loginError}</p>}
            <Button className="w-full" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in"}</Button>
          </form>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return <main className="min-h-screen bg-background p-8"><div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8"><h1 className="text-xl font-semibold">Administrator access required</h1><p className="mt-2 text-muted-foreground">This account is not assigned the WhatsApp admin role.</p><Button className="mt-6" variant="outline" onClick={() => void supabase.auth.signOut()}>Sign out</Button></div></main>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-whatsapp p-2.5 text-white"><MessageCircle className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-wider text-muted-foreground">SwiftGrowthDigital</p><h1 className="text-xl font-bold">WhatsApp Management</h1></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-sm text-muted-foreground sm:inline">{session.user.email}</span><Button variant="outline" size="sm" onClick={() => void supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-3" aria-label="WhatsApp administration">
          {tabs.map(({ id, label, icon: Icon }) => <Button key={id} variant={tab === id ? "default" : "ghost"} size="sm" onClick={() => setTab(id)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}
        </nav>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="text-2xl font-semibold">{tabs.find((item) => item.id === tab)?.label}</h2><p className="mt-1 text-sm text-muted-foreground">Live data from Supabase and Meta WhatsApp Cloud API.</p></div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
        </div>

        {actionError && <div role="status" className="mb-5 rounded-lg border border-border bg-card px-4 py-3 text-sm">{actionError}</div>}

        {tab === "overview" && <Overview health={data.health} campaigns={data.campaigns || []} />}

        {tab === "configuration" && <Configuration health={data.health} />}

        {tab === "templates" && <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Meta templates</h3><p className="text-sm text-muted-foreground">Only templates returned by Meta as APPROVED can be used in a campaign.</p></div><Button onClick={() => void runAction("refresh_templates")} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" /> Sync from Meta</Button></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Language</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Components</th></tr></thead><tbody>{(data.templates || []).map((template) => <tr key={`${template.name}-${template.language}`} className="border-t border-border"><td className="p-3 font-medium">{template.name}</td><td className="p-3">{template.language}</td><td className="p-3">{template.category || "—"}</td><td className="p-3"><StatusPill>{template.status}</StatusPill></td><td className="p-3">{(template.components || []).map((component) => component.type).join(", ") || "—"}</td></tr>)}</tbody></table></div>
          {!data.templates?.length && <p className="py-8 text-center text-sm text-muted-foreground">No templates have been synced yet.</p>}
        </section>}

        {tab === "contacts" && <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4"><h3 className="font-semibold">Lead contacts and consent</h3><p className="text-sm text-muted-foreground">Campaigns can only target contacts with recorded opt-in who have not opted out. STOP messages update opt-out automatically.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Contact</th><th className="p-3">WhatsApp</th><th className="p-3">Consent source</th><th className="p-3">Opt-in</th><th className="p-3">Opt-out</th><th className="p-3">Action</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id} className="border-t border-border"><td className="p-3"><div className="font-medium">{contact.name}</div><div className="text-xs text-muted-foreground">{contact.business_type} · {contact.city}</div></td><td className="p-3">+{contact.whatsapp}</td><td className="p-3">{contact.whatsapp_opt_in_source || "—"}</td><td className="p-3">{contact.whatsapp_opt_in ? formatDate(contact.whatsapp_opt_in_at) : "No"}</td><td className="p-3">{contact.whatsapp_opt_out ? formatDate(contact.whatsapp_opt_out_at) : "No"}</td><td className="p-3"><Button size="sm" variant="outline" disabled={busy} onClick={() => {
              if (contact.whatsapp_opt_in && !contact.whatsapp_opt_out) {
                void runAction("update_contact_consent", { leadId: contact.id, optIn: false });
              } else {
                const evidence = window.prompt("Where did the contact provide fresh WhatsApp marketing consent? Record its source.");
                if (evidence?.trim()) void runAction("update_contact_consent", { leadId: contact.id, optIn: true, consentSource: evidence.trim() });
              }
            }}>{contact.whatsapp_opt_in && !contact.whatsapp_opt_out ? "Opt out" : "Record opt-in"}</Button></td></tr>)}</tbody></table></div>
          {!contacts.length && <p className="py-8 text-center text-sm text-muted-foreground">No contacts found.</p>}
          <div className="mt-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{contactResult.total} contacts · page {contactPage + 1}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={contactPage === 0 || loading} onClick={() => setContactPage((page) => page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={(contactPage + 1) * contactResult.pageSize >= contactResult.total || loading} onClick={() => setContactPage((page) => page + 1)}>Next</Button></div></div>
        </section>}

        {tab === "campaigns" && <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Create a campaign</h3><p className="mb-5 mt-1 text-sm text-muted-foreground">Choose an approved Meta template and select opted-in contacts. A scheduled server worker sends messages through the Cloud API.</p>
            <form onSubmit={submitCampaign} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="campaign-name">Campaign name</Label><Input id="campaign-name" required maxLength={120} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="campaign-template">Approved template</Label><select id="campaign-template" required value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select an approved template</option>{eligibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select></div>
              <div className="space-y-2 lg:col-span-2"><Label htmlFor="template-components">Template components JSON (optional)</Label><Textarea id="template-components" rows={5} placeholder={'[{"type":"body","parameters":[{"type":"text","text":"Example value"}]}]'} value={componentJson} onChange={(event) => setComponentJson(event.target.value)} /><p className="text-xs text-muted-foreground">Use values that match the selected approved template’s placeholders. This is sent to Meta as template components.</p></div>
              <div className="space-y-3 lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label>Eligible contacts on this page</Label><span className="text-sm text-muted-foreground">{selectedContacts.size} selected across pages</span></div><div className="max-h-64 overflow-auto rounded-lg border border-border">{contacts.map((contact) => {
                const eligible = contact.whatsapp_opt_in && !contact.whatsapp_opt_out && Boolean(contact.whatsapp_opt_in_at) && Boolean(contact.whatsapp_opt_in_source?.trim());
                const checked = selectedContacts.has(contact.id);
                return <label key={contact.id} className={`flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 ${eligible ? "cursor-pointer" : "opacity-50"}`}><Checkbox checked={checked} disabled={!eligible} onCheckedChange={(value) => setSelectedContacts((current) => { const next = new Set(current); if (value) next.add(contact.id); else next.delete(contact.id); return next; })} /><span className="min-w-0 flex-1 truncate text-sm">{contact.name} · +{contact.whatsapp}</span><span className="text-xs text-muted-foreground">{eligible ? "Opted in" : "No consent"}</span></label>;
              })}{!contacts.length && <p className="p-4 text-sm text-muted-foreground">No contacts on this page.</p>}</div><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Selections are retained across pages. Only opted-in contacts without an opt-out can be selected.</p><div className="flex shrink-0 gap-2"><Button type="button" size="sm" variant="outline" disabled={contactPage === 0 || loading} onClick={() => setContactPage((page) => page - 1)}>Previous</Button><Button type="button" size="sm" variant="outline" disabled={(contactPage + 1) * contactResult.pageSize >= contactResult.total || loading} onClick={() => setContactPage((page) => page + 1)}>Next</Button></div></div></div>
              <div className="lg:col-span-2"><Button type="submit" disabled={busy || !selectedContacts.size || !eligibleTemplates.length}><Send className="mr-2 h-4 w-4" /> Queue campaign</Button></div>
            </form>
          </section>
          <CampaignTable campaigns={data.campaigns || []} />
        </div>}

        {tab === "messages" && <WhatsAppInbox />}

        {tab === "webhook" && <section className="rounded-xl border border-border bg-card p-5"><h3 className="mb-1 font-semibold">Webhook event history</h3><p className="mb-5 text-sm text-muted-foreground">Only validated, deduplicated Meta webhook events appear here.</p><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Received</th><th className="p-3">Event</th><th className="p-3">Meta message ID</th><th className="p-3">Status</th><th className="p-3">Occurred</th></tr></thead><tbody>{(data.events || []).map((event) => <tr key={event.id} className="border-t border-border"><td className="p-3">{formatDate(event.received_at)}</td><td className="p-3">{event.event_type}</td><td className="max-w-56 truncate p-3 font-mono text-xs">{event.meta_message_id || "—"}</td><td className="p-3">{event.message_status ? <StatusPill>{event.message_status}</StatusPill> : "—"}</td><td className="p-3">{formatDate(event.event_timestamp)}</td></tr>)}</tbody></table></div>{!data.events?.length && <p className="py-8 text-center text-sm text-muted-foreground">No webhook events have been received.</p>}</section>}
      </div>
    </main>
  );
}

function Overview({ health, campaigns }: { health?: HealthResult; campaigns: Campaign[] }) {
  const totals = campaigns.reduce((sum, campaign) => ({
    recipients: sum.recipients + Number(campaign.total_recipients || 0),
    queued: sum.queued + Number(campaign.queued || 0),
    sent: sum.sent + Number(campaign.sent || 0),
    delivered: sum.delivered + Number(campaign.delivered || 0),
    read: sum.read + Number(campaign.read || 0),
    failed: sum.failed + Number(campaign.failed || 0),
  }), { recipients: 0, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 });
  const cards = [
    ["Total recipients", totals.recipients], ["Queued", totals.queued], ["Sent", totals.sent],
    ["Delivered", totals.delivered], ["Read", totals.read], ["Failed", totals.failed],
  ];
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div><Configuration health={health} /><CampaignTable campaigns={campaigns} /></div>;
}

function Configuration({ health }: { health?: HealthResult }) {
  const items = [
    ["Overall integration", health?.configurationComplete ? "Connected" : "Configuration pending"],
    ["Meta WhatsApp API", health?.apiConnected ? "Connected" : "Not connected"],
    ["Phone Number ID", health?.phoneNumberConfigured ? "Configured" : "Missing"],
    ["Phone number check", health?.phoneNumberVerified ? "Verified" : "Not verified"],
    ["WABA", health?.businessAccountConfigured ? "Configured" : "Missing"],
    ["Webhook secrets", health?.webhookConfigured ? "Configured" : "Missing"],
    ["Webhook endpoint", health?.webhookReachable ? "Reachable" : "Unavailable"],
    ["Graph API version", health?.apiVersionValid ? "Valid" : "Invalid or missing"],
    ["Database schema", health?.databaseReady ? "Ready" : "Not ready"],
    ["Worker secret", health?.workerSecretConfigured ? "Configured" : "Missing"],
    ["Campaign scheduler", health?.workerRecentlyActive ? "Active" : "No recent run"],
    ["Approved templates", health ? `${health.approvedTemplateCount} available` : "Checking…"],
  ];
  return <section className="rounded-xl border border-border bg-card p-5"><h3 className="font-semibold">Configuration status</h3><p className="mb-4 mt-1 text-sm text-muted-foreground">Access tokens, app secrets, and verification tokens are never displayed.</p><div className="grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"><span className="text-sm">{label}</span><StatusPill>{value}</StatusPill></div>)}</div>{health?.workerLastRunAt && <p className="mt-3 text-xs text-muted-foreground">Last campaign worker run: {formatDate(health.workerLastRunAt)} · {health.workerLastStatus}</p>}{health?.missing?.length > 0 && <p className="mt-4 text-sm text-amber-600">Missing configuration: {health.missing.join(", ")}</p>}{health?.apiError && <p className="mt-3 text-sm text-destructive">Meta API check: {health.apiError.message || health.apiError.type || "request failed"}</p>}</section>;
}

function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  return <section className="rounded-xl border border-border bg-card p-5"><h3 className="mb-4 font-semibold">Campaign analytics</h3><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Campaign</th><th className="p-3">Status</th><th className="p-3">Total</th><th className="p-3">Queued</th><th className="p-3">Sent</th><th className="p-3">Delivered</th><th className="p-3">Read</th><th className="p-3">Failed</th><th className="p-3">Delivery / Read rate</th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.campaign_id} className="border-t border-border"><td className="p-3 font-medium">{campaign.name}</td><td className="p-3"><StatusPill>{campaign.campaign_status}</StatusPill></td><td className="p-3">{campaign.total_recipients}</td><td className="p-3">{campaign.queued + campaign.sending}</td><td className="p-3">{campaign.sent}</td><td className="p-3">{campaign.delivered}</td><td className="p-3">{campaign.read}</td><td className="p-3">{campaign.failed}</td><td className="p-3">{campaign.delivery_rate ?? "—"}% / {campaign.read_rate ?? "—"}%</td></tr>)}</tbody></table></div>{!campaigns.length && <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet.</p>}<p className="mt-4 text-xs text-muted-foreground">Delivery rate is delivered or read recipients divided by completed send attempts. Read rate is read recipients divided by delivered or read recipients. Figures come from persisted Meta send responses and webhook events.</p></section>;
}
