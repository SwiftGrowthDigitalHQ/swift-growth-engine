import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, LogOut, MessageCircle, Send, Settings2, FileText, Users, Megaphone, MessagesSquare, Activity, Plus, Edit, Trash2, List, ChevronLeft, Search, X, Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppInbox } from "@/components/WhatsAppInbox";

type Tab = "overview" | "configuration" | "templates" | "contacts" | "campaigns" | "batches" | "messages" | "webhook";
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
  name: string | null;
  business_type: string | null;
  city: string | null;
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
interface ContactBatch {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface BatchStats {
  total_contacts: number;
  opted_in_contacts: number;
  opted_out_contacts: number;
  without_whatsapp: number;
  eligible_contacts: number;
}
interface BatchMember {
  lead_id: string;
  added_at: string;
  name: string | null;
  business_type: string | null;
  city: string | null;
  whatsapp: string;
  whatsapp_opt_in: boolean;
  whatsapp_opt_in_at: string | null;
  whatsapp_opt_in_source: string | null;
  whatsapp_opt_out: boolean;
  whatsapp_opt_out_at: string | null;
  source: string;
  status: string;
  created_at: string;
  membership_source: "manual" | "rule";
}
interface BatchMembersPage { members: BatchMember[]; total: number; pageSize: number }
interface BatchRule {
  id: string;
  batch_id: string;
  field: string;
  operator: string;
  value: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface AdminData {
  health?: HealthResult;
  templates?: WhatsAppTemplate[];
  contacts?: WhatsAppContact[];
  contactResult?: ContactPage;
  campaigns?: Campaign[];
  messages?: WhatsAppMessage[];
  events?: WebhookEvent[];
  batches?: ContactBatch[];
  batchStats?: BatchStats;
  batchMembers?: BatchMembersPage;
  batchRules?: BatchRule[];
}

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "configuration", label: "Configuration", icon: Settings2 },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "batches", label: "Batches", icon: List },
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
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState("");
  const [editContactBusinessType, setEditContactBusinessType] = useState("");
  const [editContactCity, setEditContactCity] = useState("");
  const [webhookPage, setWebhookPage] = useState(0);
  const [webhookEventType, setWebhookEventType] = useState("");
  const [webhookMessageStatus, setWebhookMessageStatus] = useState("");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [batchPage, setBatchPage] = useState(0);
  const [batchSearch, setBatchSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchMemberPage, setBatchMemberPage] = useState(0);
  const [batchMemberSearch, setBatchMemberSearch] = useState("");
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchSlug, setNewBatchSlug] = useState("");
  const [newBatchDescription, setNewBatchDescription] = useState("");
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editBatchName, setEditBatchName] = useState("");
  const [editBatchSlug, setEditBatchSlug] = useState("");
  const [editBatchDescription, setEditBatchDescription] = useState("");
  const [editBatchIsActive, setEditBatchIsActive] = useState(true);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [campaignName, setCampaignName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [componentJson, setComponentJson] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [batchRules, setBatchRules] = useState<BatchRule[]>([]);
  const [newRuleField, setNewRuleField] = useState("");
  const [newRuleOperator, setNewRuleOperator] = useState("");
  const [newRuleValue, setNewRuleValue] = useState("");
  const [newRuleIsActive, setNewRuleIsActive] = useState(true);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [editRuleField, setEditRuleField] = useState("");
  const [editRuleOperator, setEditRuleOperator] = useState("");
  const [editRuleValue, setEditRuleValue] = useState("");
  const [editRuleIsActive, setEditRuleIsActive] = useState(true);
  const [contactBatches, setContactBatches] = useState<Record<string, { id: string; name: string; membership_source: "manual" | "rule" }[]>>({});

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
          target === "webhook" ? invokeAdmin("list_webhook_events", { page: webhookPage, pageSize: 50, eventType: webhookEventType || undefined, messageStatus: webhookMessageStatus || undefined, search: webhookSearch || undefined }) : Promise.resolve(null),
        ]);
        setData((current) => ({ ...current, health: healthResult as unknown as HealthResult, ...(eventsResult ? { events: (eventsResult.events as WebhookEvent[] | undefined) || [] } : {}) }));
      } else if (target === "templates") {
        const result = await invokeAdmin("list_templates");
        setData((current) => ({ ...current, templates: (result.templates as WhatsAppTemplate[] | undefined) || [] }));
      } else if (target === "contacts") {
        const [contactResult, batchMembershipsResult] = await Promise.all([
          invokeAdmin("list_contacts", { page: contactPage }),
          invokeAdmin("get_contact_batch_memberships", { leadIds: [] }), // Will be populated after contacts load
        ]);
        setData((current) => ({ ...current, contactResult: contactResult as unknown as ContactPage }));
        // Fetch batch memberships for the loaded contacts
        if (contactResult.contacts && contactResult.contacts.length > 0) {
          const leadIds = contactResult.contacts.map((c) => c.id);
          const batchMembershipsResult = await invokeAdmin("get_contact_batch_memberships", { leadIds });
          if (batchMembershipsResult.memberships) {
            setContactBatches(batchMembershipsResult.memberships);
          }
        }
      } else if (target === "messages") {
        const result = await invokeAdmin("list_messages");
        setData((current) => ({ ...current, messages: (result.messages as WhatsAppMessage[] | undefined) || [] }));
      } else if (target === "batches") {
        const [batchesResult, statsResult, membersResult, rulesResult] = await Promise.all([
          invokeAdmin("list_batches", { page: batchPage, pageSize: 30, search: batchSearch || undefined }),
          selectedBatchId ? invokeAdmin("get_batch_stats", { batchId: selectedBatchId }) : Promise.resolve(null),
          selectedBatchId ? invokeAdmin("get_batch_members", { batchId: selectedBatchId, page: batchMemberPage, pageSize: 50, search: batchMemberSearch || undefined }) : Promise.resolve(null),
          selectedBatchId ? invokeAdmin("list_batch_rules", { batchId: selectedBatchId }) : Promise.resolve(null),
        ]);
        setData((current) => ({
          ...current,
          batches: (batchesResult.batches as ContactBatch[] | undefined) || [],
          ...(statsResult ? { batchStats: statsResult.stats as BatchStats } : {}),
          ...(membersResult ? { batchMembers: membersResult as unknown as BatchMembersPage } : {}),
          ...(rulesResult ? { batchRules: rulesResult.rules as BatchRule[] } : {}),
        }));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not load WhatsApp data");
    } finally {
      setLoading(false);
    }
  }, [tab, isAdmin, contactPage, webhookPage, webhookEventType, webhookMessageStatus, webhookSearch, batchPage, batchSearch, selectedBatchId, batchMemberPage, batchMemberSearch]);

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

  const startEditContact = (contact: WhatsAppContact) => {
    setEditContactId(contact.id);
    setEditContactName(contact.name ?? "");
    setEditContactBusinessType(contact.business_type ?? "");
    setEditContactCity(contact.city ?? "");
  };

  const saveContact = async () => {
    if (!editContactId) return;
    const result = await runAction("update_lead", {
      leadId: editContactId,
      name: editContactName,
      business_type: editContactBusinessType,
      city: editContactCity,
    });
    if (result) setEditContactId(null);
  };

  const eligibleTemplates = useMemo(() => (data.templates || []).filter((template) => template.status === "APPROVED"), [data.templates]);
  const contactResult = data.contactResult || { contacts: [], total: 0, page: 0, pageSize: 100 };
  const contacts = contactResult.contacts || [];
  const batches = data.batches || [];
  const batchStats = data.batchStats;
  const batchMembers = data.batchMembers;

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
    if (selectedBatchIds.size > 0) {
      // New batch-based campaign creation
      const result = await runAction("create_campaign_from_batches", {
        name: campaignName,
        templateId,
        batchIds: [...selectedBatchIds],
        components,
      });
      if (result) {
        setCampaignName("");
        setTemplateId("");
        setComponentJson("");
        setSelectedBatchIds(new Set());
        setActionError(`${result.queued} recipient(s) queued from ${selectedBatchIds.size} batch(es); ${result.failed} failed. The scheduled worker sends queued messages.`);
      }
    } else if (selectedContacts.size > 0) {
      // Legacy manual contact selection
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
    }
  };

  const handleBatchSearch = (query: string) => {
    setBatchSearch(query);
    setBatchPage(0);
    void load();
  };

  const handleBatchMemberSearch = (query: string) => {
    setBatchMemberSearch(query);
    setBatchMemberPage(0);
    void load();
  };

  const handleCreateBatch = async () => {
    const slug = newBatchSlug || newBatchName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const result = await runAction("create_batch", {
      name: newBatchName,
      slug,
      description: newBatchDescription,
      isActive: true,
    });
    if (result) {
      setNewBatchName("");
      setNewBatchSlug("");
      setNewBatchDescription("");
    }
  };

  const handleEditBatch = async () => {
    if (!editBatchId) return;
    const result = await runAction("update_batch", {
      batchId: editBatchId,
      name: editBatchName,
      slug: editBatchSlug,
      description: editBatchDescription,
      isActive: editBatchIsActive,
    });
    if (result) {
      setEditBatchId(null);
      setEditBatchName("");
      setEditBatchSlug("");
      setEditBatchDescription("");
      setEditBatchIsActive(true);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm("Delete this batch? This will remove all contact memberships but not the contacts themselves.")) return;
    const result = await runAction("delete_batch", { batchId });
    if (result && selectedBatchId === batchId) {
      setSelectedBatchId(null);
    }
  };

  const handleAddBatchMembers = async (leadIds: string[]) => {
    if (!selectedBatchId || leadIds.length === 0) return;
    const result = await runAction("add_batch_members", {
      batchId: selectedBatchId,
      leadIds,
    });
    if (result) {
      void load();
    }
  };

  const handleRemoveBatchMembers = async (leadIds: string[]) => {
    if (!selectedBatchId || leadIds.length === 0) return;
    const result = await runAction("remove_batch_members", {
      batchId: selectedBatchId,
      leadIds,
    });
    if (result) {
      void load();
    }
  };

  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    setBatchMemberPage(0);
    setBatchMemberSearch("");
    void load();
  };

  const handleBackToBatches = () => {
    setSelectedBatchId(null);
  };

  const handleRuleSearch = (query: string) => {
    // Rules are loaded with batch detail, no separate search needed
  };

  const handleCreateRule = async () => {
    if (!selectedBatchId) return;
    const result = await runAction("create_batch_rule", {
      batchId: selectedBatchId,
      field: newRuleField,
      operator: newRuleOperator,
      value: newRuleValue,
      isActive: newRuleIsActive,
    });
    if (result) {
      setNewRuleField("");
      setNewRuleOperator("");
      setNewRuleValue("");
      setNewRuleIsActive(true);
      void load();
    }
  };

  const handleEditRule = async () => {
    if (!editRuleId || !selectedBatchId) return;
    const result = await runAction("update_batch_rule", {
      ruleId: editRuleId,
      field: editRuleField,
      operator: editRuleOperator,
      value: editRuleValue,
      isActive: editRuleIsActive,
    });
    if (result) {
      setEditRuleId(null);
      setEditRuleField("");
      setEditRuleOperator("");
      setEditRuleValue("");
      setEditRuleIsActive(true);
      void load();
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedBatchId) return;
    if (!window.confirm("Delete this assignment rule?")) return;
    const result = await runAction("delete_batch_rule", { ruleId, batchId: selectedBatchId });
    if (result) {
      void load();
    }
  };

  const handleReEvaluateBatch = async () => {
    if (!selectedBatchId) return;
    if (!window.confirm("Re-evaluate every contact against this batch's rules? Stale rule-based memberships will be removed; manual memberships are preserved.")) return;
    const result = await runAction("re_evaluate_batch_rules", { batchId: selectedBatchId });
    if (result) {
      toast({ title: "Batch re-evaluated", description: `${result.assignedCount} rule-based membership(s) added. Stale rule memberships were removed.` });
      void load();
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
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Contact</th><th className="p-3">WhatsApp</th><th className="p-3">Consent source</th><th className="p-3">Opt-in</th><th className="p-3">Opt-out</th><th className="p-3">Batches</th><th className="p-3">Action</th></tr></thead><tbody>{contacts.map((contact) => {
            const batches = contactBatches[contact.id] || [];
            return (
              <tr key={contact.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium">{contact.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{contact.business_type || "—"} · {contact.city || "—"}</div>
                </td>
                <td className="p-3">+{contact.whatsapp}</td>
                <td className="p-3">{contact.whatsapp_opt_in_source || "—"}</td>
                <td className="p-3">{contact.whatsapp_opt_in ? formatDate(contact.whatsapp_opt_in_at) : "No"}</td>
                <td className="p-3">{contact.whatsapp_opt_out ? formatDate(contact.whatsapp_opt_out_at) : "No"}</td>
                <td className="p-3">
                  {batches.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {batches.map((b) => (
                        <Badge
                          key={b.id}
                          variant={b.membership_source === "rule" ? "default" : "secondary"}
                          className="text-xs px-1.5 py-0.5"
                        >
                          {b.name} ({b.membership_source === "rule" ? "Rule" : "Manual"})
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => startEditContact(contact)}>
                    <Edit className="mr-1 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (contact.whatsapp_opt_in && !contact.whatsapp_opt_out) {
                        void runAction("update_contact_consent", { leadId: contact.id, optIn: false });
                      } else {
                        const evidence = window.prompt("Where did the contact provide fresh WhatsApp marketing consent? Record its source.");
                        if (evidence?.trim()) void runAction("update_contact_consent", { leadId: contact.id, optIn: true, consentSource: evidence.trim() });
                      }
                    }}
                  >
                    {contact.whatsapp_opt_in && !contact.whatsapp_opt_out ? "Opt out" : "Record opt-in"}
                  </Button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody></table></div>
          <Dialog open={editContactId !== null} onOpenChange={(open) => !open && setEditContactId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Edit contact</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2"><Label htmlFor="contact-name">Name</Label><Input id="contact-name" value={editContactName} onChange={(event) => setEditContactName(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="contact-business-type">Business type</Label><Input id="contact-business-type" value={editContactBusinessType} onChange={(event) => setEditContactBusinessType(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="contact-city">City</Label><Input id="contact-city" value={editContactCity} onChange={(event) => setEditContactCity(event.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Leave an optional field blank to keep it empty.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditContactId(null)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void saveContact()} disabled={busy}>Save contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {!contacts.length && <p className="py-8 text-center text-sm text-muted-foreground">No contacts found.</p>}
          <div className="mt-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{contactResult.total} contacts · page {contactPage + 1}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={contactPage === 0 || loading} onClick={() => setContactPage((page) => page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={(contactPage + 1) * contactResult.pageSize >= contactResult.total || loading} onClick={() => setContactPage((page) => page + 1)}>Next</Button></div></div>
        </section>}

        {tab === "batches" && <section className="rounded-xl border border-border bg-card p-5">
          {selectedBatchId ? (
            <BatchDetail
              batchId={selectedBatchId}
              batchStats={batchStats}
              batchMembers={batchMembers}
              batchRules={batchRules}
              batchMemberPage={batchMemberPage}
              batchMemberSearch={batchMemberSearch}
              onBack={handleBackToBatches}
              onSearch={handleBatchMemberSearch}
              onPageChange={setBatchMemberPage}
              onAddMembers={handleAddBatchMembers}
              onRemoveMembers={handleRemoveBatchMembers}
              loading={loading}
              runAction={runAction}
              contactResult={contactResult}
              contactPage={contactPage}
              setContactPage={setContactPage}
              newRuleField={newRuleField}
              newRuleOperator={newRuleOperator}
              newRuleValue={newRuleValue}
              newRuleIsActive={newRuleIsActive}
              setNewRuleField={setNewRuleField}
              setNewRuleOperator={setNewRuleOperator}
              setNewRuleValue={setNewRuleValue}
              setNewRuleIsActive={setNewRuleIsActive}
              editRuleId={editRuleId}
              editRuleField={editRuleField}
              editRuleOperator={editRuleOperator}
              editRuleValue={editRuleValue}
              editRuleIsActive={editRuleIsActive}
              setEditRuleField={setEditRuleField}
              setEditRuleOperator={setEditRuleOperator}
              setEditRuleValue={setEditRuleValue}
              setEditRuleIsActive={setEditRuleIsActive}
              handleCreateRule={handleCreateRule}
              handleEditRule={handleEditRule}
              handleDeleteRule={handleDeleteRule}
              handleReEvaluateBatch={handleReEvaluateBatch}
            />
          ) : (
            <BatchList
              batches={batches}
              batchPage={batchPage}
              batchSearch={batchSearch}
              onSearch={handleBatchSearch}
              onPageChange={setBatchPage}
              onCreate={handleCreateBatch}
              onEdit={setEditBatchId}
              onDelete={handleDeleteBatch}
              onSelect={handleSelectBatch}
              newBatchName={newBatchName}
              newBatchSlug={newBatchSlug}
              newBatchDescription={newBatchDescription}
              setNewBatchName={setNewBatchName}
              setNewBatchSlug={setNewBatchSlug}
              setNewBatchDescription={setNewBatchDescription}
              editBatchId={editBatchId}
              editBatchName={editBatchName}
              editBatchSlug={editBatchSlug}
              editBatchDescription={editBatchDescription}
              editBatchIsActive={editBatchIsActive}
              setEditBatchName={setEditBatchName}
              setEditBatchSlug={setEditBatchSlug}
              setEditBatchDescription={setEditBatchDescription}
              setEditBatchIsActive={setEditBatchIsActive}
              handleEditBatch={handleEditBatch}
              loading={loading}
              runAction={runAction}
            />
          )}
        </section>}

        {tab === "campaigns" && <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Create a campaign</h3>
            <p className="mb-5 mt-1 text-sm text-muted-foreground">Choose an approved Meta template and select batches. A scheduled server worker sends messages through the Cloud API.</p>
            <form onSubmit={submitCampaign} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="campaign-name">Campaign name</Label><Input id="campaign-name" required maxLength={120} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="campaign-template">Approved template</Label><select id="campaign-template" required value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select an approved template</option>{eligibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select></div>
              <div className="space-y-2 lg:col-span-2"><Label htmlFor="template-components">Template components JSON (optional)</Label><Textarea id="template-components" rows={5} placeholder={'[{"type":"body","parameters":[{"type":"text","text":"Example value"}]}]'} value={componentJson} onChange={(event) => setComponentJson(event.target.value)} /><p className="text-xs text-muted-foreground">Use values that match the selected approved template's placeholders. This is sent to Meta as template components.</p></div>
              <div className="space-y-3 lg:col-span-2">
                <Label>Audience (select one or more batches)</Label>
                <div className="max-h-64 overflow-auto rounded-lg border border-border p-3 space-y-2">
                  {batches.filter(b => b.is_active).map((batch) => (
                    <label key={batch.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={selectedBatchIds.has(batch.id)}
                        onCheckedChange={(value) => setSelectedBatchIds((current) => {
                          const next = new Set(current);
                          if (value) next.add(batch.id);
                          else next.delete(batch.id);
                          return next;
                        })}
                      />
                      <div>
                        <span className="font-medium">{batch.name}</span>
                        <p className="text-xs text-muted-foreground">{batch.slug}</p>
                      </div>
                    </label>
                  ))}
                  {!batches.length && <p className="text-sm text-muted-foreground">No batches created yet. Go to the Batches tab to create one.</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedBatchIds.size > 0
                    ? `${selectedBatchIds.size} batch(es) selected. Recipients will be resolved server-side at queue time.`
                    : "Or manually select contacts below (legacy)"}
                </p>
              </div>
              {selectedBatchIds.size === 0 && (
                <div className="space-y-3 lg:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2"><Label>Eligible contacts on this page</Label><span className="text-sm text-muted-foreground">{selectedContacts.size} selected across pages</span></div>
                  <div className="max-h-64 overflow-auto rounded-lg border border-border">{contacts.map((contact) => {
                    const eligible = contact.whatsapp_opt_in && !contact.whatsapp_opt_out && Boolean(contact.whatsapp_opt_in_at) && Boolean(contact.whatsapp_opt_in_source?.trim());
                    const checked = selectedContacts.has(contact.id);
                    return <label key={contact.id} className={`flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 ${eligible ? "cursor-pointer" : "opacity-50"}`}><Checkbox checked={checked} disabled={!eligible} onCheckedChange={(value) => setSelectedContacts((current) => { const next = new Set(current); if (value) next.add(contact.id); else next.delete(contact.id); return next; })} /><span className="min-w-0 flex-1 truncate text-sm">{contact.name} · +{contact.whatsapp}</span><span className="text-xs text-muted-foreground">{eligible ? "Opted in" : "No consent"}</span></label>;
                  })}{!contacts.length && <p className="p-4 text-sm text-muted-foreground">No contacts on this page.</p>}</div>
                  <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">Selections are retained across pages. Only opted-in contacts without an opt-out can be selected.</p><div className="flex shrink-0 gap-2"><Button type="button" size="sm" variant="outline" disabled={contactPage === 0 || loading} onClick={() => setContactPage((page) => page - 1)}>Previous</Button><Button type="button" size="sm" variant="outline" disabled={(contactPage + 1) * contactResult.pageSize >= contactResult.total || loading} onClick={() => setContactPage((page) => page + 1)}>Next</Button></div></div>
                </div>
              )}
              <div className="lg:col-span-2"><Button type="submit" disabled={busy || (selectedBatchIds.size === 0 && selectedContacts.size === 0) || !eligibleTemplates.length}><Send className="mr-2 h-4 w-4" /> Queue campaign</Button></div>
            </form>
          </section>
          <CampaignTable campaigns={data.campaigns || []} />
        </div>}

        {tab === "messages" && <WhatsAppInbox />}

        {tab === "webhook" && <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 font-semibold">Webhook event history</h3>
        <p className="mb-5 text-sm text-muted-foreground">Only validated, deduplicated Meta webhook events appear here.</p>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="webhook-event-type" className="text-sm">Event Type</Label>
            <select id="webhook-event-type" value={webhookEventType} onChange={(e) => { setWebhookEventType(e.target.value); setWebhookPage(0); void load(); }} className="h-9 w-auto rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="incoming_message">Incoming Message</option>
              <option value="message_status">Message Status</option>
              <option value="account_error">Account Error</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="webhook-message-status" className="text-sm">Status</Label>
            <select id="webhook-message-status" value={webhookMessageStatus} onChange={(e) => { setWebhookMessageStatus(e.target.value); setWebhookPage(0); void load(); }} className="h-9 w-auto rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="read">Read</option>
              <option value="failed">Failed</option>
              <option value="received">Received</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="webhook-search" className="text-sm">Search by Meta Message ID</Label>
            <Input id="webhook-search" type="text" placeholder="Search..." value={webhookSearch} onChange={(e) => { setWebhookSearch(e.target.value); setWebhookPage(0); void load(); }} className="w-full" />
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-muted-foreground"><tr><th className="p-3">Received</th><th className="p-3">Event</th><th className="p-3">Meta message ID</th><th className="p-3">Status</th><th className="p-3">Occurred</th></tr></thead><tbody>{(data.events || []).map((event) => <tr key={event.id} className="border-t border-border"><td className="p-3">{formatDate(event.received_at)}</td><td className="p-3">{event.event_type}</td><td className="max-w-56 truncate p-3 font-mono text-xs">{event.meta_message_id || "—"}</td><td className="p-3">{event.message_status ? <StatusPill>{event.message_status}</StatusPill> : "—"}</td><td className="p-3">{formatDate(event.event_timestamp)}</td></tr>)}</tbody></table></div>
        {!data.events?.length && <p className="py-8 text-center text-sm text-muted-foreground">No webhook events have been received.</p>}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {webhookPage + 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={webhookPage === 0 || loading} onClick={() => { setWebhookPage((p) => p - 1); void load(); }}>Previous</Button>
            <Button variant="outline" size="sm" disabled={(data.events?.length ?? 0) < 50 || loading} onClick={() => { setWebhookPage((p) => p + 1); void load(); }}>Next</Button>
          </div>
        </div>
      </section>}
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

function BatchList({
  batches,
  batchPage,
  batchSearch,
  onSearch,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
  onSelect,
  newBatchName,
  newBatchSlug,
  newBatchDescription,
  setNewBatchName,
  setNewBatchSlug,
  setNewBatchDescription,
  editBatchId,
  editBatchName,
  editBatchSlug,
  editBatchDescription,
  editBatchIsActive,
  setEditBatchName,
  setEditBatchSlug,
  setEditBatchDescription,
  setEditBatchIsActive,
  handleEditBatch,
  loading,
  runAction,
}: {
  batches: ContactBatch[];
  batchPage: number;
  batchSearch: string;
  onSearch: (query: string) => void;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onEdit: (batchId: string) => void;
  onDelete: (batchId: string) => void;
  onSelect: (batchId: string) => void;
  newBatchName: string;
  newBatchSlug: string;
  newBatchDescription: string;
  setNewBatchName: (v: string) => void;
  setNewBatchSlug: (v: string) => void;
  setNewBatchDescription: (v: string) => void;
  editBatchId: string | null;
  editBatchName: string;
  editBatchSlug: string;
  editBatchDescription: string;
  editBatchIsActive: boolean;
  setEditBatchName: (v: string) => void;
  setEditBatchSlug: (v: string) => void;
  setEditBatchDescription: (v: string) => void;
  setEditBatchIsActive: (v: boolean) => void;
  handleEditBatch: () => void;
  loading: boolean;
  runAction: (action: string, payload: Record<string, unknown>) => Promise<AdminResult>;
}) {
  const totalBatches = batches.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Contact Batches / Segments</h3>
          <p className="text-sm text-muted-foreground">Organize contacts into reusable audiences for campaigns.</p>
        </div>
        <Button onClick={onCreate} disabled={loading}><Plus className="mr-2 h-4 w-4" /> Create Batch</Button>
      </div>

      <Dialog open={!!editBatchId} onOpenChange={(open) => !open && onEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBatchId ? "Edit Batch" : "Create Batch"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-name">Name</Label>
              <Input id="batch-name" required value={editBatchId ? editBatchName : newBatchName} onChange={(e) => editBatchId ? setEditBatchName(e.target.value) : setNewBatchName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-slug">Slug (URL-friendly)</Label>
              <Input id="batch-slug" required value={editBatchId ? editBatchSlug : newBatchSlug} onChange={(e) => editBatchId ? setEditBatchSlug(e.target.value) : setNewBatchSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-description">Description (optional)</Label>
              <Textarea id="batch-description" rows={3} value={editBatchId ? editBatchDescription : newBatchDescription} onChange={(e) => editBatchId ? setEditBatchDescription(e.target.value) : setNewBatchDescription(e.target.value)} />
            </div>
            {editBatchId && (
              <div className="flex items-center gap-2">
                <Checkbox checked={editBatchIsActive} onCheckedChange={setEditBatchIsActive} />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onEdit(null)}>Cancel</Button>
            <Button onClick={handleEditBatch} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newBatchName || !editBatchId} onOpenChange={() => {}}>
        {/* Create dialog is inline */}
      </Dialog>

      {editBatchId ? null : (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-medium mb-3">Create New Batch</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-batch-name">Name</Label>
              <Input id="new-batch-name" placeholder="e.g., Coaching Institute" value={newBatchName} onChange={(e) => setNewBatchName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-batch-slug">Slug</Label>
              <Input id="new-batch-slug" placeholder="coaching-institute" value={newBatchSlug} onChange={(e) => setNewBatchSlug(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="new-batch-description">Description (optional)</Label>
              <Textarea id="new-batch-description" rows={2} placeholder="Description for this batch..." value={newBatchDescription} onChange={(e) => setNewBatchDescription(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={onCreate} disabled={loading || !newBatchName.trim() || !newBatchSlug.trim()}><Plus className="mr-2 h-4 w-4" /> Create Batch</Button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Label htmlFor="batch-search" className="text-sm">Search batches</Label>
        <Input id="batch-search" type="text" placeholder="Search by name, slug, description..." value={batchSearch} onChange={(e) => onSearch(e.target.value)} className="w-full max-w-xs" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Description</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className="border-t border-border">
                <td className="p-3 font-medium">{batch.name}</td>
                <td className="p-3 font-mono text-xs">{batch.slug}</td>
                <td className="p-3 text-muted-foreground max-w-xs truncate">{batch.description || "—"}</td>
                <td className="p-3"><StatusPill>{batch.is_active ? "Active" : "Inactive"}</StatusPill></td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(batch.created_at)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onSelect(batch.id)} title="View contacts"><List className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { onEdit(batch.id); }} title="Edit"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(batch.id)} title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!batches.length && !batchSearch && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No batches created yet. Create your first batch above.
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{totalBatches} batches · page {batchPage + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={batchPage === 0 || loading} onClick={() => onPageChange(batchPage - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={(batches.length ?? 0) < 30 || loading} onClick={() => onPageChange(batchPage + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function BatchDetail({
  batchId,
  batchStats,
  batchMembers,
  batchRules,
  batchMemberPage,
  batchMemberSearch,
  onBack,
  onSearch,
  onPageChange,
  onAddMembers,
  onRemoveMembers,
  loading,
  runAction,
  contactResult,
  contactPage,
  setContactPage,
  newRuleField,
  newRuleOperator,
  newRuleValue,
  newRuleIsActive,
  setNewRuleField,
  setNewRuleOperator,
  setNewRuleValue,
  setNewRuleIsActive,
  editRuleId,
  editRuleField,
  editRuleOperator,
  editRuleValue,
  editRuleIsActive,
  setEditRuleField,
  setEditRuleOperator,
  setEditRuleValue,
  setEditRuleIsActive,
  handleCreateRule,
  handleEditRule,
  handleDeleteRule,
  handleReEvaluateBatch,
}: {
  batchId: string;
  batchStats: BatchStats | undefined;
  batchMembers: BatchMembersPage | undefined;
  batchRules: BatchRule[];
  batchMemberPage: number;
  batchMemberSearch: string;
  onBack: () => void;
  onSearch: (query: string) => void;
  onPageChange: (page: number) => void;
  onAddMembers: (leadIds: string[]) => void;
  onRemoveMembers: (leadIds: string[]) => void;
  loading: boolean;
  runAction: (action: string, payload: Record<string, unknown>) => Promise<AdminResult>;
  contactResult: ContactPage;
  contactPage: number;
  setContactPage: (page: number) => void;
  newRuleField: string;
  newRuleOperator: string;
  newRuleValue: string;
  newRuleIsActive: boolean;
  setNewRuleField: (v: string) => void;
  setNewRuleOperator: (v: string) => void;
  setNewRuleValue: (v: string) => void;
  setNewRuleIsActive: (v: boolean) => void;
  editRuleId: string | null;
  editRuleField: string;
  editRuleOperator: string;
  editRuleValue: string;
  editRuleIsActive: boolean;
  setEditRuleField: (v: string) => void;
  setEditRuleOperator: (v: string) => void;
  setEditRuleValue: (v: string) => void;
  setEditRuleIsActive: (v: boolean) => void;
  handleCreateRule: () => void;
  handleEditRule: () => void;
  handleDeleteRule: (ruleId: string) => void;
  handleReEvaluateBatch: () => void;
}) {
  const stats = batchStats || { total_contacts: 0, opted_in_contacts: 0, opted_out_contacts: 0, without_whatsapp: 0, eligible_contacts: 0 };
  const members = batchMembers?.members || [];
  const totalMembers = batchMembers?.total || 0;

  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [addContactSearch, setAddContactSearch] = useState("");
  const [addContactPage, setAddContactPage] = useState(0);
  const [selectedAddContactIds, setSelectedAddContactIds] = useState<Set<string>>(new Set());

  const addableContacts = contactResult.contacts?.filter(c => !members.some(m => m.lead_id === c.id)) || [];

  const handleSelectAllAddable = () => {
    if (selectedAddContactIds.size === addableContacts.length) {
      setSelectedAddContactIds(new Set());
    } else {
      setSelectedAddContactIds(new Set(addableContacts.map((c) => c.id)));
    }
  };

  const handleSelectAll = () => {
    if (selectedMemberIds.size === members.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(members.map((m) => m.lead_id)));
    }
  };

  const loadAddableContacts = async () => {
    // Fetch contacts not already in this batch
    // For simplicity, we'll use the existing contacts list
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h3 className="font-semibold">Batch Details</h3>
            <p className="text-sm text-muted-foreground">Manage contacts in this batch</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddContacts(true)} disabled={loading}><Plus className="mr-2 h-4 w-4" /> Add Contacts</Button>
          {selectedMemberIds.size > 0 && (
            <Button variant="destructive" onClick={() => onRemoveMembers([...selectedMemberIds])} disabled={loading}>Remove Selected</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Total Contacts</p><p className="mt-2 text-3xl font-bold">{stats.total_contacts}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Eligible</p><p className="mt-2 text-3xl font-bold text-emerald-600">{stats.eligible_contacts}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Opted Out</p><p className="mt-2 text-3xl font-bold text-destructive">{stats.opted_out_contacts}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">No WhatsApp</p><p className="mt-2 text-3xl font-bold text-amber-600">{stats.without_whatsapp}</p></div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Label htmlFor="batch-member-search" className="text-sm">Search contacts</Label>
        <Input id="batch-member-search" type="text" placeholder="Search by name, WhatsApp, business type, city..." value={batchMemberSearch} onChange={(e) => onSearch(e.target.value)} className="w-full max-w-xs" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="p-3 w-10"><Checkbox checked={selectedMemberIds.size === members.length && members.length > 0} onCheckedChange={handleSelectAll} /></th>
              <th className="p-3">Contact</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">City</th>
              <th className="p-3">Opt-in</th>
              <th className="p-3">Opt-out</th>
              <th className="p-3">Source</th>
              <th className="p-3">Added</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.lead_id} className="border-t border-border">
                <td className="p-3 w-10"><Checkbox checked={selectedMemberIds.has(member.lead_id)} onCheckedChange={(value) => setSelectedMemberIds((current) => { const next = new Set(current); if (value) next.add(member.lead_id); else next.delete(member.lead_id); return next; })} /></td>
                <td className="p-3"><div className="font-medium">{member.name}</div><div className="text-xs text-muted-foreground">{member.business_type}</div></td>
                <td className="p-3">+{member.whatsapp}</td>
                <td className="p-3">{member.city}</td>
                <td className="p-3">{member.whatsapp_opt_in ? <StatusPill>Yes</StatusPill> : <StatusPill variant="secondary">No</StatusPill>}</td>
                <td className="p-3">{member.whatsapp_opt_out ? <StatusPill variant="destructive">Yes</StatusPill> : <StatusPill variant="secondary">No</StatusPill>}</td>
                <td className="p-3">
                  <Badge variant={member.membership_source === "rule" ? "default" : "secondary"} className="text-xs">
                    {member.membership_source === "rule" ? "Automatic Rule" : "Manual"}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{formatDate(member.added_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!members.length && <p className="py-8 text-center text-sm text-muted-foreground">No contacts in this batch yet.</p>}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{totalMembers} contacts · page {batchMemberPage + 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={batchMemberPage === 0 || loading} onClick={() => onPageChange(batchMemberPage - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={(members.length ?? 0) < 50 || loading} onClick={() => onPageChange(batchMemberPage + 1)}>Next</Button>
        </div>
      </div>

      {/* Assignment Rules Section */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Assignment Rules</h4>
            <p className="text-sm text-muted-foreground">Automatically assign contacts to this batch based on structured fields.</p>
          </div>
          <Button variant="outline" onClick={handleReEvaluateBatch} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Re-evaluate Batch</Button>
        </div>

        {/* Rules List */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-3">Field</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Value</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batchRules.map((rule) => (
                <tr key={rule.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{rule.field}</td>
                  <td className="p-3"><StatusPill variant={rule.operator.includes("not") ? "secondary" : "default"}>{rule.operator}</StatusPill></td>
                  <td className="p-3 font-mono text-xs">{rule.value || "(any value)"}</td>
                  <td className="p-3"><StatusPill variant={rule.is_active ? "default" : "secondary"}>{rule.is_active ? "Active" : "Inactive"}</StatusPill></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {editRuleId === rule.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={handleEditRule} title="Save"><Check className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditRuleId(null)} title="Cancel"><X className="w-4 h-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditRuleId(rule.id); setEditRuleField(rule.field); setEditRuleOperator(rule.operator); setEditRuleValue(rule.value); setEditRuleIsActive(rule.is_active); }} title="Edit"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} title="Delete" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!batchRules.length && (
          <div className="py-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
            No assignment rules configured. Add a rule below to enable automatic assignment.
          </div>
        )}

        {/* Create/Edit Rule Form */}
        <Dialog open={!!editRuleId || (newRuleField || newRuleOperator || newRuleValue)} onOpenChange={(open) => { if (!open) { setEditRuleId(null); setNewRuleField(""); setNewRuleOperator(""); setNewRuleValue(""); setNewRuleIsActive(true); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editRuleId ? "Edit Assignment Rule" : "Create Assignment Rule"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rule-field">Field</Label>
                <Select value={editRuleId ? editRuleField : newRuleField} onValueChange={(v) => editRuleId ? setEditRuleField(v) : setNewRuleField(v)} disabled={!!editRuleId}>
                  <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_type">Business Type</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="whatsapp_opt_in_source">WhatsApp Opt-in Source</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-operator">Operator</Label>
                <Select value={editRuleId ? editRuleOperator : newRuleOperator} onValueChange={(v) => editRuleId ? setEditRuleOperator(v) : setNewRuleOperator(v)}>
                  <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="is_set">Is Set (not empty)</SelectItem>
                    <SelectItem value="is_not_set">Is Not Set (empty/null)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-value">Value</Label>
                <Input id="rule-value" placeholder="e.g., Coaching Institute" value={editRuleId ? editRuleValue : newRuleValue} onChange={(e) => editRuleId ? setEditRuleValue(e.target.value) : setNewRuleValue(e.target.value)} disabled={["is_set", "is_not_set"].includes(editRuleId ? editRuleOperator : newRuleOperator)} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editRuleId ? editRuleIsActive : newRuleIsActive} onCheckedChange={(v) => editRuleId ? setEditRuleIsActive(v) : setNewRuleIsActive(v)} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditRuleId(null); setNewRuleField(""); setNewRuleOperator(""); setNewRuleValue(""); setNewRuleIsActive(true); }}>Cancel</Button>
              <Button onClick={editRuleId ? handleEditRule : handleCreateRule} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Contacts Dialog */}
      <Dialog open={showAddContacts} onOpenChange={setShowAddContacts}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Add Contacts to Batch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
            <div className="flex gap-2">
              <Input type="text" placeholder="Search contacts..." value={addContactSearch} onChange={(e) => setAddContactSearch(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={() => {}} disabled>Search</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="p-3 w-10"><Checkbox checked={selectedAddContactIds.size === addableContacts.length && addableContacts.length > 0} onCheckedChange={handleSelectAllAddable} /></th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Opt-in</th>
                  </tr>
                </thead>
                <tbody>
                  {addableContacts.map((contact) => (
                    <tr key={contact.id} className="border-t border-border">
                      <td className="p-3 w-10"><Checkbox checked={selectedAddContactIds.has(contact.id)} onCheckedChange={(value) => setSelectedAddContactIds((current) => { const next = new Set(current); if (value) next.add(contact.id); else next.delete(contact.id); return next; })} /></td>
                      <td className="p-3"><div className="font-medium">{contact.name}</div><div className="text-xs text-muted-foreground">{contact.business_type}</div></td>
                      <td className="p-3">+{contact.whatsapp}</td>
                      <td className="p-3">{contact.city}</td>
                      <td className="p-3">{contact.whatsapp_opt_in ? <StatusPill>Yes</StatusPill> : <StatusPill variant="secondary">No</StatusPill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContacts(false)}>Cancel</Button>
            <Button onClick={() => onAddMembers([...selectedAddContactIds])} disabled={loading || selectedAddContactIds.size === 0}>Add Selected ({selectedAddContactIds.size})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    );
  };
