import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3,
  Droplets, Home, Leaf, LogOut, Menu, Plus, Search, Settings, ShieldCheck,
  Sparkles, Star, UserRound, Users, Wrench, X, Zap,
} from "lucide-react";
import { api } from "./api.js";

const icons = { sparkles: Sparkles, droplets: Droplets, zap: Zap, wrench: Wrench, leaf: Leaf, settings: Settings };
const navItems = [
  { id: "home", label: "Overview", icon: Home },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "bookings", label: "My bookings", icon: CalendarDays },
  { id: "providers", label: "Our professionals", icon: Users },
];
const today = new Date().toISOString().slice(0, 10);
const currency = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount ?? 0);

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem("haven-token")));
  const [authError, setAuthError] = useState("");
  const [page, setPage] = useState("home");
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("haven-token")) return;
    let cancelled = false;
    api.me().then((restoredUser) => {
      if (cancelled) return;
      localStorage.setItem("haven-user", JSON.stringify(restoredUser));
      setUser(restoredUser);
    }).catch((err) => {
      if (cancelled) return;
      localStorage.removeItem("haven-token");
      localStorage.removeItem("haven-user");
      if (err.status !== 401) setAuthError("We couldn't restore your session. Please sign in again.");
    }).finally(() => {
      if (!cancelled) setAuthLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextServices, nextProviders, nextBookings] = await Promise.all([
        api.list("services"), api.list("providers"), api.list("bookings"),
      ]);
      setServices(nextServices);
      setProviders(nextProviders);
      setBookings(nextBookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const signIn = async (credentials, isRegister = false) => {
    const result = await (isRegister ? api.register(credentials) : api.login(credentials));
    localStorage.setItem("haven-token", result.token);
    localStorage.setItem("haven-user", JSON.stringify(result.user));
    setError("");
    setAuthError("");
    setUser(result.user);
    setPage("home");
  };

  const signOut = () => {
    localStorage.removeItem("haven-token");
    localStorage.removeItem("haven-user");
    setUser(null);
    setServices([]);
    setBookings([]);
  };

  const submitBooking = async (data) => {
    await api.create("bookings", data);
    setModal(null);
    setPage("bookings");
    await refresh();
  };

  const updateBooking = async (booking, status) => {
    await api.update("bookings", booking._id, { status });
    await refresh();
  };

  const manageRecord = async (resource, record, data) => {
    if (!record) {
      await api.create(resource, data);
    } else {
      await api.update(resource, record._id, data);
    }
    setModal(null);
    await refresh();
  };

  const removeRecord = async (resource, record) => {
    const label = record.name ?? record.service?.name ?? "this booking";
    const message = resource === "bookings" ? `Permanently delete ${label}?` : `Remove ${label}? It will no longer appear in the catalog.`;
    if (!window.confirm(message)) return;
    await api.remove(resource, record._id);
    await refresh();
  };

  const runAction = async (action) => {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading) return <div className="session-loading"><span className="brand-mark"><Home size={18} /></span><span>Getting your home in order...</span></div>;
  if (!user) return <AuthScreen onSubmit={signIn} initialError={authError} />;

  const isAdmin = user.role === "admin";
  const filteredServices = services.filter((service) =>
    `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const activePage = page;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Home size={18} strokeWidth={2.4} /></span><span>haven<span className="brand-period">.</span></span></div>
        <div className="workspace-label">YOUR HOME</div>
        <nav className="nav-list">
          {navItems.map(({ id, label, icon: Icon }) => {
            const navLabel = id === "bookings" && isAdmin ? "All bookings" : label;
            const selected = id === activePage;
            return <button key={id} className={`nav-item ${selected ? "nav-selected" : ""}`} onClick={() => { setPage(id); setMobileNav(false); }}>
              <Icon size={18} strokeWidth={selected ? 2.4 : 1.8} /><span>{navLabel}</span>
              {id === "bookings" && bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status)).length > 0 &&
                <span className="nav-count">{bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status)).length}</span>}
            </button>;
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card"><div className="help-icon"><ShieldCheck size={17} /></div><strong>Here when you need us</strong><span>Every booking is backed by our happiness promise.</span><button onClick={() => setPage("services")}>Explore services <ArrowRight size={14} /></button></div>
        <div className="sidebar-user">
          <span className="user-avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <div className="user-copy"><strong>{user.name}</strong><span>{isAdmin ? "Administrator" : "Homeowner"}</span></div>
          <button className="icon-button signout" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="breadcrumb">Home <span>/</span> <strong>{pageLabel(activePage, isAdmin)}</strong></div>
          <div className="topbar-right"><span className="location-pill"><span className="location-dot" /> Serving your neighborhood</span><span className="top-avatar">{user.name[0]}</span></div>
        </header>
        <div className="content-wrap">
          {error && <div className="alert"><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}
          {loading && <div className="loading-bar"><span /></div>}
          {activePage === "home" && <Dashboard
            user={user} bookings={bookings} services={services} providers={providers}
            onBrowse={() => setPage("services")} onBook={(service) => setModal({ type: "booking", service })}
            onManageBooking={(booking, status) => runAction(() => updateBooking(booking, status))} onAllBookings={() => setPage("bookings")}
          />}
          {activePage === "services" && <ServicesPage services={filteredServices} query={query} setQuery={setQuery}
            isAdmin={isAdmin} onBook={(service) => setModal({ type: "booking", service })}
            onAdd={() => setModal({ type: "service-form" })}
            onEdit={(record) => setModal({ type: "service-form", record })}
            onRemove={(record) => runAction(() => removeRecord("services", record))}
          />}
          {activePage === "bookings" && <BookingsPage bookings={bookings} isAdmin={isAdmin}
            onCancel={(booking) => runAction(() => updateBooking(booking, "cancelled"))}
            onStatus={(booking, status) => runAction(() => updateBooking(booking, status))}
            onDelete={(booking) => runAction(() => removeRecord("bookings", booking))}
            onBook={() => setPage("services")}
            onAssign={(booking) => setModal({ type: "assign-provider", booking })}
          />}
          {activePage === "providers" && <ProvidersPage providers={providers} isAdmin={isAdmin}
            onAdd={() => setModal({ type: "provider-form" })}
            onEdit={(record) => setModal({ type: "provider-form", record })}
            onRemove={(record) => runAction(() => removeRecord("providers", record))}
            onBookService={() => setPage("services")}
          />}
        </div>
      </main>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      {modal?.type === "booking" && <BookingModal service={modal.service} providers={providers} onClose={() => setModal(null)} onSubmit={submitBooking} />}
      {modal?.type === "service-form" && <RecordModal kind="service" record={modal.record}
        onClose={() => setModal(null)} onSave={(data) => manageRecord("services", modal.record, data)} />}
      {modal?.type === "provider-form" && <RecordModal kind="provider" record={modal.record}
        onClose={() => setModal(null)} onSave={(data) => manageRecord("providers", modal.record, data)} />}
      {modal?.type === "assign-provider" && <AssignProviderModal booking={modal.booking} providers={providers}
        onClose={() => setModal(null)} onSave={async (provider) => { await api.update("bookings", modal.booking._id, { provider }); setModal(null); await refresh(); }} />}
    </div>
  );
}

function pageLabel(page, isAdmin) {
  return ({ home: "Overview", services: "Services", bookings: isAdmin ? "All bookings" : "My bookings", providers: "Our professionals" })[page];
}

function Dashboard({ user, bookings, services, providers, onBrowse, onBook, onManageBooking, onAllBookings }) {
  const upcoming = bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const nextBooking = upcoming[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return <div className="page-enter">
    <section className="welcome-row">
      <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR HOME, IN GOOD HANDS</div><h1>{greeting}, {user.name.split(" ")[0]}<span className="heading-wave">.</span></h1><p>A little care goes a long way. What can we help with today?</p></div>
      <button className="button button-dark" onClick={onBrowse}><Plus size={17} /> Book a service <ArrowRight size={16} /></button>
    </section>
    <section className="hero-card">
      <div className="hero-copy"><span className="hero-kicker">YOUR HOME DESERVES THE BEST</span><h2>More time for<br />the things you love.</h2><p>From a quick fix to a fresh start, find a trusted pro for every corner of home.</p><button className="button button-white" onClick={onBrowse}>Find your service <ArrowRight size={16} /></button></div>
      <div className="hero-art" aria-hidden="true">
        <div className="sun-shape" /><div className="hero-plant plant-left"><i /><i /><i /><b /></div><div className="hero-window"><div /><div /><div /><div /></div>
        <div className="hero-sofa"><div /><div /></div><div className="hero-table" /><div className="hero-vase" /><div className="hero-floor" />
        <div className="floating-badge"><span className="badge-star">✦</span><div><strong>4.9 / 5</strong><small>from happy homes</small></div></div>
      </div>
    </section>
    <section className="stats-grid">
      <StatCard icon={CalendarDays} label="Upcoming bookings" value={upcoming.length} hint={upcoming.length ? "You're all set" : "Ready when you are"} accent="mint" />
      <StatCard icon={Sparkles} label="Services to explore" value={services.length} hint="Thoughtfully chosen for you" accent="peach" />
      <StatCard icon={Users} label="Local professionals" value={providers.length} hint="Vetted, trusted, highly rated" accent="lavender" />
      <StatCard icon={ShieldCheck} label="Homeowner promise" value="100%" hint="Care you can count on" accent="blue" />
    </section>
    <section className="lower-grid">
      <div className="panel upcoming-panel">
        <div className="panel-heading"><div><span className="eyebrow">PLAN AHEAD</span><h3>Your upcoming visits</h3></div><button className="text-button" onClick={onAllBookings}>See all <ArrowRight size={15} /></button></div>
        {!upcoming.length ? <EmptyState title="A little help is just around the corner" copy="Book your first service and we'll keep all the details right here." action="Browse services" onClick={onBrowse} /> :
          <div className="compact-bookings">{upcoming.map((booking) => <BookingRow key={booking._id} booking={booking} onCancel={onManageBooking} />)}</div>}
      </div>
      <div className="panel picks-panel">
        <div className="panel-heading"><div><span className="eyebrow">A GOOD PLACE TO START</span><h3>Popular around here</h3></div><span className="sparkle-mark">✦</span></div>
        <div className="pick-list">{services.slice(0, 3).map((service) => {
          const Icon = icons[service.icon] ?? Sparkles;
          return <button className="pick-row" key={service._id} onClick={() => onBook(service)}><span className={`service-icon icon-${service.category.toLowerCase()}`}><Icon size={18} /></span><span className="pick-copy"><strong>{service.name}</strong><small>{service.duration} min · from {currency(service.price)}</small></span><ArrowUpRight size={16} className="pick-arrow" /></button>;
        })}</div>
      </div>
    </section>
    {nextBooking && <div className="next-visit-note"><span className="note-icon"><Clock3 size={17} /></span><span><strong>Coming up next:</strong> {nextBooking.service?.name ?? "Home service"} on {formatDate(nextBooking.date)} at {formatTime(nextBooking.time)}.</span><ArrowDownLeft size={15} /></div>}
  </div>;
}

function StatCard({ icon: Icon, label, value, hint, accent }) {
  return <div className="stat-card"><span className={`stat-icon ${accent}`}><Icon size={18} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></div>;
}

function ServicesPage({ services, query, setQuery, isAdmin, onBook, onAdd, onEdit, onRemove }) {
  const categories = ["All services", ...new Set(services.map((service) => service.category))];
  const [category, setCategory] = useState("All services");
  const visible = category === "All services" ? services : services.filter((service) => service.category === category);
  return <div className="page-enter">
    <PageHeading eyebrow="A LITTLE HELP, RIGHT AT HOME" title="Good things happen at home." subtitle="The right help makes all the difference. Find your person, pick your time, and leave the rest to us."
      action={isAdmin && <button className="button button-dark" onClick={onAdd}><Plus size={17} /> Add service</button>} />
    <div className="catalog-toolbar"><div className="category-tabs">{categories.map((item) => <button key={item} className={`category-tab ${item === category ? "category-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a service..." /><kbd>⌘ K</kbd></label>
    </div>
    <div className="service-grid">{visible.map((service, index) => <ServiceCard key={service._id} service={service} index={index} isAdmin={isAdmin} onBook={onBook} onEdit={onEdit} onRemove={onRemove} />)}</div>
    {!visible.length && <EmptyState title="Nothing on this list yet" copy="Try another category or search for a different service." />}
    <div className="promise-strip"><ShieldCheck size={20} /><div><strong>The Haven home promise</strong><span>Every professional is vetted, every visit is protected, and every detail is handled with care.</span></div><span className="promise-rating"><Star size={14} fill="currentColor" /> 4.9 average rating</span></div>
  </div>;
}

function ServiceCard({ service, index, isAdmin, onBook, onEdit, onRemove }) {
  const Icon = icons[service.icon] ?? Sparkles;
  return <article className={`service-card tone-${index % 5}`}><div className="service-card-top"><span className={`service-icon big-icon icon-${service.category.toLowerCase()}`}><Icon size={21} /></span>
    {isAdmin ? <div className="record-actions"><button onClick={() => onEdit(service)} aria-label="Edit service"><Settings size={16} /></button><button onClick={() => onRemove(service)} aria-label="Remove service"><X size={16} /></button></div> : <span className="card-rating"><Star size={13} fill="currentColor" /> 4.9</span>}
  </div><span className="service-category">{service.category}</span><h3>{service.name}</h3><p>{service.description}</p>
    <div className="service-meta"><span><Clock3 size={14} /> {service.duration} min</span><span>from <strong>{currency(service.price)}</strong></span></div>
    <button className="service-book" onClick={() => onBook(service)}>{isAdmin ? "Preview booking" : "Book this service"} <ArrowRight size={15} /></button>
  </article>;
}

function BookingsPage({ bookings, isAdmin, onCancel, onStatus, onDelete, onBook, onAssign }) {
  const [filter, setFilter] = useState("all");
  const tabs = [["all", "All visits"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]];
  const visible = bookings.filter((booking) => filter === "all" || booking.status === filter).sort((a, b) => b.date.localeCompare(a.date));
  return <div className="page-enter">
    <PageHeading eyebrow="EVERYTHING, IN ONE PLACE" title={isAdmin ? "Booking management." : "Your home, taken care of."}
      subtitle={isAdmin ? "Review, assign, and update appointments across the Haven community." : "All your visits, notes, and little details — right where you need them."}
      action={!isAdmin && <button className="button button-dark" onClick={onBook}><Plus size={17} /> Book a service</button>} />
    <div className="booking-filter">{tabs.map(([id, label]) => <button key={id} onClick={() => setFilter(id)} className={filter === id ? "filter-active" : ""}>{label}<span>{id === "all" ? bookings.length : bookings.filter((booking) => booking.status === id).length}</span></button>)}</div>
    <div className="booking-list">{visible.map((booking) => <BookingCard key={booking._id} booking={booking} isAdmin={isAdmin} onCancel={onCancel} onStatus={onStatus} onDelete={onDelete} onAssign={onAssign} />)}</div>
    {!visible.length && <EmptyState title="It's quiet here for now" copy={filter === "all" ? "Book a service whenever you're ready for a helping hand." : `No ${filter} visits to show.`} action={!isAdmin && filter === "all" ? "Explore services" : null} onClick={onBook} />}
  </div>;
}

function BookingCard({ booking, isAdmin, onCancel, onStatus, onDelete, onAssign }) {
  const Icon = icons[booking.service?.icon] ?? Sparkles;
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className="booking-card"><div className="booking-date"><strong>{new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span></div>
    <div className="booking-info"><div className="booking-title"><span className="service-icon mini-icon"><Icon size={16} /></span><h3>{booking.service?.name ?? "Home service"}</h3><StatusBadge status={booking.status} /></div>
      <div className="booking-subline"><span><CalendarDays size={14} /> {formatDate(booking.date)}</span><span><Clock3 size={14} /> {formatTime(booking.time)}</span><span><UserRound size={14} /> {booking.provider?.name ?? "Professional to be assigned"}</span></div>
      <div className="booking-address">{booking.address}{isAdmin && booking.customer?.name && ` · Booked by ${booking.customer.name}`}</div>
    </div>
    <div className="booking-end"><strong>{currency(booking.totalPrice)}</strong>
      {isAdmin ? <div className="admin-booking-actions"><button className="button button-outline button-small" onClick={() => onAssign(booking)}>Assign pro</button><div className="menu-holder"><button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Booking actions"><ChevronDown size={17} /></button>{menuOpen && <div className="dropdown-menu">
        {["pending", "confirmed", "completed", "cancelled"].map((status) => <button key={status} onClick={() => { setMenuOpen(false); onStatus(booking, status); }}>{status[0].toUpperCase() + status.slice(1)}{booking.status === status && <Check size={14} />}</button>)}
        <button className="danger-text" onClick={() => { setMenuOpen(false); onDelete(booking); }}>Delete booking</button>
      </div>}</div></div> : ["pending", "confirmed"].includes(booking.status) ? <button className="text-button cancel-button" onClick={() => onCancel(booking)}>Cancel visit</button> : null}
    </div>
  </article>;
}

function BookingRow({ booking, onCancel }) {
  return <div className="compact-row"><div className="compact-date"><strong>{new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}</span></div>
    <div className="compact-copy"><strong>{booking.service?.name ?? "Home service"}</strong><span>{formatTime(booking.time)} · {booking.provider?.name ?? "Pro to be assigned"}</span></div><StatusBadge status={booking.status} />
    {["pending", "confirmed"].includes(booking.status) && <button className="compact-cancel" onClick={() => onCancel(booking)}>Cancel</button>}
  </div>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status === "confirmed" && <Check size={12} />}{status[0].toUpperCase() + status.slice(1)}</span>;
}

function ProvidersPage({ providers, isAdmin, onAdd, onEdit, onRemove, onBookService }) {
  return <div className="page-enter">
    <PageHeading eyebrow="GOOD PEOPLE, DOING GOOD WORK" title="Meet your neighborhood pros." subtitle="Kind, capable, and carefully vetted — the people who make home feel even more like home."
      action={isAdmin && <button className="button button-dark" onClick={onAdd}><Plus size={17} /> Add professional</button>} />
    <div className="provider-grid">{providers.map((provider, index) => <article className="provider-card" key={provider._id}>
      <div className="provider-art" style={{ background: provider.avatarColor || "#dfe8d8" }}><div className={`provider-portrait portrait-${index % 4}`}><span>{provider.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span></div>
        <span className="available-tag"><span /> Available this week</span>
        {isAdmin && <div className="record-actions provider-actions"><button onClick={() => onEdit(provider)} aria-label="Edit professional"><Settings size={16} /></button><button onClick={() => onRemove(provider)} aria-label="Remove professional"><X size={16} /></button></div>}
      </div>
      <div className="provider-details"><div className="provider-name-line"><h3>{provider.name}</h3><span><Star size={14} fill="currentColor" /> {provider.rating?.toFixed(1) ?? "5.0"} <small>({provider.reviews ?? 0})</small></span></div>
        <p>{provider.bio}</p><div className="specialty-list">{provider.specialties?.map((specialty) => <span key={specialty}>{specialty}</span>)}</div>
        <div className="provider-footer"><span>from <strong>{currency(provider.hourlyRate)}/hr</strong></span><button onClick={onBookService}>Find a service <ArrowRight size={15} /></button></div>
      </div>
    </article>)}</div>
    {!providers.length && <EmptyState title="We’re growing our local team" copy="Check back soon to meet the trusted professionals in your neighborhood." />}
    <div className="pro-note"><div className="pro-note-icon"><ShieldCheck size={20} /></div><div><strong>Every pro, personally vetted.</strong><span>Background checked, reference checked, and genuinely good at what they do.</span></div><span className="pro-note-stars">★★★★★</span></div>
  </div>;
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function EmptyState({ title, copy, action, onClick }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={21} /></span><strong>{title}</strong><p>{copy}</p>{action && <button className="button button-outline" onClick={onClick}>{action} <ArrowRight size={15} /></button>}</div>;
}

function AuthScreen({ onSubmit, initialError = "" }) {
  const [mode, setMode] = useState("login");
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await onSubmit(values, mode === "register"); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const demo = async (role) => {
    setBusy(true); setError("");
    try { await onSubmit({ email: role === "admin" ? "admin@haven.demo" : "alex@haven.demo", password: "haven123" }); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="auth-screen"><div className="auth-art"><div className="auth-brand"><span className="brand-mark"><Home size={18} /></span><span>haven<span className="brand-period">.</span></span></div>
    <div className="auth-art-copy"><span className="hero-kicker">A LITTLE MORE ROOM TO BREATHE</span><h1>Home feels better<br />when it’s <em>handled.</em></h1><p>Good people. Thoughtful help. A little more time for you.</p></div>
    <div className="auth-illustration"><div className="auth-sun" /><div className="auth-window" /><div className="auth-couch" /><div className="auth-plant"><i /><i /><i /><b /></div><div className="auth-rug" /></div>
    <div className="auth-caption"><span>✦</span> A little help goes a long way.</div>
  </div><div className="auth-side"><form className="auth-form" onSubmit={submit}>
    <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "MAKE YOURSELF AT HOME"}</span>
    <h2>{mode === "login" ? "Good to have you here." : "Let's get you settled."}</h2>
    <p className="auth-subtitle">{mode === "login" ? "Sign in to find a little help for home." : "Create an account and meet your new favorite pros."}</p>
    {mode === "register" && <label className="field-label">Your name<input required autoComplete="name" placeholder="Alex Morgan" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>}
    <label className="field-label">Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
    <label className="field-label">Password<input required minLength={mode === "register" ? 8 : undefined} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></label>
    {error && <div className="form-error">{error}</div>}
    <button className="button button-dark auth-submit" disabled={busy}>{busy ? "Just a moment..." : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} /></button>
    <div className="auth-switch">{mode === "login" ? "New to Haven?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}> {mode === "login" ? "Create an account" : "Sign in"}</button></div>
    <div className="demo-divider"><span /> OR TRY A DEMO <span /></div>
    <div className="demo-buttons"><button type="button" disabled={busy} onClick={() => demo("customer")}><UserRound size={15} /> Homeowner demo</button><button type="button" disabled={busy} onClick={() => demo("admin")}><ShieldCheck size={15} /> Admin demo</button></div>
  </form><div className="auth-legal">By continuing, you agree to Haven’s terms and privacy policy.</div></div></div>;
}

function BookingModal({ service, providers, onClose, onSubmit }) {
  const matching = providers.filter((provider) => provider.specialties?.some((specialty) => service.category.toLowerCase().includes(specialty.toLowerCase()) || specialty.toLowerCase().includes(service.category.toLowerCase())));
  const [values, setValues] = useState({ date: today, time: "09:00", address: "", notes: "", provider: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try { await onSubmit({ ...values, service: service._id, provider: values.provider || undefined }); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title="Let's get you booked." eyebrow="A GOOD CHOICE" onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="booking-service-summary"><span className="service-icon"><Sparkles size={18} /></span><div><strong>{service.name}</strong><span>{service.duration} minutes · from {currency(service.price)}</span></div><span className="summary-price">{currency(service.price)}</span></div>
      <div className="form-two"><label className="field-label">Your preferred day<input required type="date" min={today} value={values.date} onChange={(event) => setValues({ ...values, date: event.target.value })} /></label>
        <label className="field-label">A time that works<select required value={values.time} onChange={(event) => setValues({ ...values, time: event.target.value })}>{["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00"].map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}</select></label></div>
      <label className="field-label">Where should we meet you?<input required placeholder="Street address, city, ZIP" value={values.address} onChange={(event) => setValues({ ...values, address: event.target.value })} /></label>
      <label className="field-label">Choose a professional <select value={values.provider} onChange={(event) => setValues({ ...values, provider: event.target.value })}><option value="">Match me with someone</option>{matching.map((provider) => <option key={provider._id} value={provider._id}>{provider.name} · ★ {provider.rating}</option>)}{!matching.length && providers.map((provider) => <option key={provider._id} value={provider._id}>{provider.name} · ★ {provider.rating}</option>)}</select></label>
      <label className="field-label">Anything we should know? <span className="optional-label">OPTIONAL</span><textarea rows="3" placeholder="A small detail can make a big difference..." value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-footer"><span><ShieldCheck size={15} /> No payment due today</span><button className="button button-dark" disabled={busy}>{busy ? "Booking..." : "Request this visit"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function RecordModal({ kind, record, onClose, onSave }) {
  const service = kind === "service";
  const [values, setValues] = useState(record ? {
    ...record,
    specialties: record.specialties?.join(", ") ?? "",
  } : service ? { name: "", category: "Cleaning", description: "", price: 89, duration: 60, icon: "sparkles" } : { name: "", bio: "", specialties: "", hourlyRate: 45, rating: 5, reviews: 0, avatarColor: "#dfe8d8" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    const data = { ...values, ...(service ? {} : { specialties: values.specialties.split(",").map((item) => item.trim()).filter(Boolean) }), ...(service ? { price: Number(values.price), duration: Number(values.duration) } : { hourlyRate: Number(values.hourlyRate), rating: Number(values.rating), reviews: Number(values.reviews) }) };
    try { await onSave(data); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title={`${record ? "A little update" : "Add to the Haven family"}.`} eyebrow={record ? "EDIT DETAILS" : `NEW ${service ? "SERVICE" : "PROFESSIONAL"}`} onClose={onClose}>
    <form className="modal-form" onSubmit={save}>
      <label className="field-label">{service ? "Service name" : "Professional name"}<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} /></label>
      {service ? <>
        <div className="form-two"><label className="field-label">Category<input required value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} /></label><label className="field-label">Starting price ($)<input required type="number" min="0" value={values.price} onChange={(event) => setValues({ ...values, price: event.target.value })} /></label></div>
        <div className="form-two"><label className="field-label">Duration (minutes)<input required type="number" min="15" step="15" value={values.duration} onChange={(event) => setValues({ ...values, duration: event.target.value })} /></label><label className="field-label">Icon<select value={values.icon} onChange={(event) => setValues({ ...values, icon: event.target.value })}>{Object.keys(icons).map((icon) => <option key={icon}>{icon}</option>)}</select></label></div>
        <label className="field-label">A little about the service<textarea required rows="3" value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} /></label>
      </> : <>
        <label className="field-label">A little about them<textarea required rows="3" value={values.bio} onChange={(event) => setValues({ ...values, bio: event.target.value })} /></label>
        <label className="field-label">Specialties <span className="optional-label">COMMA SEPARATED</span><input placeholder="Plumbing, water heaters" value={values.specialties} onChange={(event) => setValues({ ...values, specialties: event.target.value })} /></label>
        <div className="form-two"><label className="field-label">Hourly rate ($)<input required type="number" min="0" value={values.hourlyRate} onChange={(event) => setValues({ ...values, hourlyRate: event.target.value })} /></label><label className="field-label">Rating<input type="number" min="0" max="5" step="0.1" value={values.rating} onChange={(event) => setValues({ ...values, rating: event.target.value })} /></label></div>
      </>}
      {error && <div className="form-error">{error}</div>}
      <div className="modal-footer"><span><ShieldCheck size={15} /> Saved to your catalog</span><button className="button button-dark" disabled={busy}>{busy ? "Saving..." : record ? "Save changes" : `Add ${service ? "service" : "professional"}`} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function AssignProviderModal({ booking, providers, onClose, onSave }) {
  const [provider, setProvider] = useState(booking.provider?._id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setError("");
    setBusy(true);
    try {
      await onSave(provider || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return <Modal title="A great match makes a difference." eyebrow="ASSIGN A PROFESSIONAL" onClose={onClose}>
    <div className="assignment-summary"><span className="eyebrow">BOOKING</span><strong>{booking.service?.name}</strong><span>{formatDate(booking.date)} · {formatTime(booking.time)}</span></div>
    <label className="field-label">Choose a professional<select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">Leave unassigned</option>{providers.map((person) => <option key={person._id} value={person._id}>{person.name} · ★ {person.rating}</option>)}</select></label>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-footer"><span /> <button className="button button-dark" disabled={busy} onClick={save}>{busy ? "Saving..." : "Save assignment"} <ArrowRight size={15} /></button></div>
  </Modal>;
}

function Modal({ title, eyebrow, onClose, children }) {
  useEffect(() => {
    const close = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true">
    <div className="modal-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>{children}
  </section></div>;
}

function formatDate(value) {
  if (!value) return "Date to be confirmed";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(value) {
  if (!value) return "Time to be confirmed";
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default App;
