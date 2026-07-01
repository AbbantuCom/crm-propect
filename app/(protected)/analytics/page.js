"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/UserProvider";
import { SALES_STATUSES } from "@/components/SalesStatusSelect";

const OUTCOME_LABELS = {
  interested:     "Interested",
  not_interested: "Not Interested",
  no_answer:      "No Answer",
  call_back:      "Call Back Later",
  voicemail:      "Left Voicemail",
  other:          "Other",
};

const OUTCOME_COLORS = {
  interested:     "#16a34a",
  not_interested: "#dc2626",
  no_answer:      "#9ca3af",
  call_back:      "#d97706",
  voicemail:      "#7c3aed",
  other:          "#6b7280",
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card stat-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="stat-value" style={{ color: accent }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, count, total, color, bg }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="status-bar-row">
      <div className="status-bar-label">
        <span
          className="badge"
          style={{ color, background: bg, border: `1px solid ${color}44`, minWidth: 110 }}
        >
          {label}
        </span>
      </div>
      <div className="status-bar-track">
        <div
          className="status-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="status-bar-count">{count} <span style={{ color: "var(--latte-light)", fontSize: 11 }}>({pct}%)</span></div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: "var(--coffee)" }}>
      {children}
    </h2>
  );
}

export default function AnalyticsPage() {
  const user = useUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="container"><div className="empty-state">Loading analytics…</div></div>;
  if (err || data?.error) return <div className="container"><div className="empty-state" style={{ color: "var(--danger)" }}>Error: {err || data?.error}</div></div>;

  const {
    totalProspects = 0,
    contactedCount = 0,
    wonCount       = 0,
    lostCount      = 0,
    closedCount    = 0,
    statusBreakdown = {},
    myStats        = { totalCalls: 0, uniqueProspects: 0, outcomes: {} },
    teamStats      = [],
  } = data;

  const contactRate = totalProspects > 0 ? Math.round((contactedCount / totalProspects) * 100) : 0;
  const winRate     = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  return (
    <div className="container">
      <div className="section-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            {isAdmin ? "Overall team performance and prospect pipeline." : "Your personal activity and the overall pipeline."}
          </p>
        </div>
      </div>

      {/* ── Overview stat cards ── */}
      <div className="stat-cards-grid">
        <StatCard
          label="Total Prospects"
          value={totalProspects.toLocaleString()}
          sub="in database"
          accent="#705c4e"
        />
        <StatCard
          label="Contacted"
          value={contactedCount.toLocaleString()}
          sub={`${contactRate}% of total`}
          accent="#2563eb"
        />
        <StatCard
          label="Won"
          value={wonCount.toLocaleString()}
          sub={closedCount > 0 ? `${winRate}% close rate` : "no closed deals yet"}
          accent="#15803d"
        />
        <StatCard
          label="Closed"
          value={closedCount.toLocaleString()}
          sub={`${wonCount} won · ${lostCount} lost`}
          accent="#6b7280"
        />
      </div>

      {/* ── Status breakdown ── */}
      <div className="card analytics-section">
        <SectionTitle>Pipeline by Status</SectionTitle>
        {SALES_STATUSES.map((s) => (
          <ProgressBar
            key={s.value}
            label={s.label}
            count={statusBreakdown[s.value] || 0}
            total={totalProspects}
            color={s.color}
            bg={s.bg}
          />
        ))}
      </div>

      {/* ── My contribution ── */}
      <div className="analytics-two-col">
        <div className="card analytics-section">
          <SectionTitle>My Contribution</SectionTitle>
          <div className="stat-cards-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <StatCard
              label="Calls Made"
              value={myStats.totalCalls.toLocaleString()}
              accent="#2563eb"
            />
            <StatCard
              label="Prospects Called"
              value={myStats.uniqueProspects.toLocaleString()}
              accent="#7c3aed"
            />
          </div>

          {Object.keys(myStats.outcomes || {}).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--latte)", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 10 }}>
                My Call Outcomes
              </div>
              {Object.entries(myStats.outcomes).map(([outcome, count]) => {
                const total = myStats.totalCalls;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const color = OUTCOME_COLORS[outcome] || OUTCOME_COLORS.other;
                return (
                  <div key={outcome} className="status-bar-row" style={{ marginBottom: 8 }}>
                    <div className="status-bar-label">
                      <span className="badge" style={{ color, background: `${color}18`, minWidth: 110 }}>
                        {OUTCOME_LABELS[outcome] || outcome}
                      </span>
                    </div>
                    <div className="status-bar-track">
                      <div className="status-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="status-bar-count">{count} <span style={{ color: "var(--latte-light)", fontSize: 11 }}>({pct}%)</span></div>
                  </div>
                );
              })}
            </div>
          )}

          {myStats.totalCalls === 0 && (
            <p style={{ color: "var(--latte)", fontSize: 13, margin: "12px 0 0" }}>
              You haven't logged any calls yet.
            </p>
          )}
        </div>

        {/* ── Team table (admin/superadmin) ── */}
        {isAdmin && (
          <div className="card analytics-section">
            <SectionTitle>Team Contribution</SectionTitle>
            {teamStats.length === 0 ? (
              <p style={{ color: "var(--latte)", fontSize: 13, margin: 0 }}>No call activity recorded yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th style={{ textAlign: "right" }}>Calls</th>
                    <th style={{ textAlign: "right" }}>Prospects</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((row) => {
                    const callShare = myStats.totalCalls > 0 || teamStats.length
                      ? Math.round((row.totalCalls / teamStats.reduce((s, r) => s + r.totalCalls, 0)) * 100)
                      : 0;
                    return (
                      <tr key={row.user}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {row.user}
                            {row.user === user?.email && (
                              <span className="badge" style={{ marginLeft: 6, background: "#dbeafe", color: "#2563eb", fontSize: 10 }}>You</span>
                            )}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <div className="status-bar-track" style={{ height: 4 }}>
                              <div
                                className="status-bar-fill"
                                style={{ width: `${callShare}%`, background: row.user === user?.email ? "#2563eb" : "var(--latte-light)" }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{row.totalCalls}</td>
                        <td style={{ textAlign: "right", color: "var(--latte)" }}>{row.uniqueProspects}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
