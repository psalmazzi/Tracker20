import React, { useState, useCallback, memo, useEffect } from "react";
import Login from "./components/Login";
import { useSupabaseData } from "./hooks/useSupabaseData";
import { supabase } from "./supabase";
import CampaignSwitcher from "./components/CampaignSwitcher";
import JoinCampaign from "./components/JoinCampaign";
import ShareCampaign from "./components/ShareCampaign";
import InitiativeList from "./components/InitiativeList";
import "./styles.css";

// ── Status effects (Tormenta RPG) ─────────────────────────────────────────────
const STATUSES = [
  { id: "abalado", label: "Abalado", emoji: "😰", color: "#f59e0b" },
  { id: "apavorado", label: "Apavorado", emoji: "😱", color: "#ef4444" },
  { id: "atordoado", label: "Atordoado", emoji: "💫", color: "#8b5cf6" },
  { id: "caido", label: "Caído", emoji: "⬇️", color: "#6b7280" },
  { id: "cego", label: "Cego", emoji: "🙈", color: "#94a3b8" },
  { id: "confuso", label: "Confuso", emoji: "🌀", color: "#ec4899" },
  { id: "enjoado", label: "Enjoado", emoji: "🤢", color: "#65a30d" },
  { id: "envenenado", label: "Envenenado", emoji: "☠️", color: "#16a34a" },
  { id: "fatigado", label: "Fatigado", emoji: "😴", color: "#a8a29e" },
  { id: "imovel", label: "Imóvel", emoji: "🔒", color: "#0284c7" },
  { id: "lento", label: "Lento", emoji: "🐢", color: "#64748b" },
  { id: "paralisado", label: "Paralisado", emoji: "❄️", color: "#38bdf8" },
  { id: "queimando", label: "Queimando", emoji: "🔥", color: "#ea580c" },
  { id: "sangrando", label: "Sangrando", emoji: "🩸", color: "#dc2626" },
  { id: "surdo", label: "Surdo", emoji: "🔇", color: "#78716c" },
];

const uid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ── StatBar ────────────────────────────────────────────────────────────────────
const StatBar = memo(function StatBar({
  label,
  cur,
  max,
  temp = 0,
  fillColor,
  tempColor,
  onAdjust,
  onAdjustTemp,
  editableMax,
  onSetMax,
}) {
  const [v, setV] = useState("");
  const [tv, setTv] = useState("");

  const pct = clamp(cur / (max || 1), 0, 1) * 100;
  const space = Math.max(0, 1 - cur / (max || 1));
  const tempPct = Math.min(temp / (max || 1), space) * 100;

  const apply = (sign) => {
    const n = parseInt(v || "1", 10);
    if (!isNaN(n) && n > 0 && onAdjust) {
      onAdjust(sign * n);
      setV("");
    }
  };

  const applyTmp = (sign) => {
    const n = parseInt(tv || "1", 10);
    if (!isNaN(n) && n > 0 && onAdjustTemp) {
      onAdjustTemp(sign * n);
      setTv("");
    }
  };

  const maxEl = editableMax ? (
    <input
      className="sbar-max-in"
      type="number"
      min="1"
      value={max}
      onChange={(e) => {
        const n = parseInt(e.target.value);
        if (!isNaN(n) && n > 0 && onSetMax) onSetMax(n);
      }}
    />
  ) : (
    max
  );

  return (
    <div className="sbar">
      <div className="sbar-hd">
        <span className="sbar-lbl">{label}</span>
        <span className="sbar-val">
          {cur}
          {temp > 0 && <span style={{ color: tempColor }}>+{temp}</span>}
          {" / "}
          {maxEl}
        </span>
      </div>
      <div className="sbar-track">
        <div
          className="sbar-fill"
          style={{ width: `${pct}%`, background: fillColor }}
        />
        {temp > 0 && (
          <div
            className="sbar-tmp"
            style={{
              left: `${pct}%`,
              width: `${tempPct}%`,
              background: tempColor,
            }}
          />
        )}
      </div>

      {/* Só mostrar os controles se onAdjust existir (não for viewer) */}
      {onAdjust && (
        <div className="sbar-ctrls">
          <button
            className="btn btn-ghost btn-xs btn-icon"
            onClick={() => apply(-1)}
          >
            −
          </button>
          <input
            className="sbar-in"
            type="number"
            placeholder="1"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(1);
              if (e.key === "-") {
                e.preventDefault();
                apply(-1);
              }
            }}
          />
          <button
            className="btn btn-ghost btn-xs btn-icon"
            onClick={() => apply(1)}
          >
            +
          </button>
          {onAdjustTemp && (
            <>
              <div className="sbar-sep" />
              <span
                style={{
                  fontSize: ".62rem",
                  color: tempColor,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                }}
              >
                tmp
              </span>
              <input
                className="sbar-in"
                type="number"
                placeholder="1"
                value={tv}
                style={{ borderColor: tempColor + "66" }}
                onChange={(e) => setTv(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyTmp(1);
                }}
              />
              <button
                className="btn btn-xs btn-icon"
                style={{
                  background: tempColor + "25",
                  color: tempColor,
                  border: `1px solid ${tempColor}55`,
                }}
                onClick={() => applyTmp(1)}
              >
                +
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// ── StatBarResumo ─────────────────────────────────────────────────────────────
const StatBarResumo = memo(function StatBarResumo({
  label,
  temp = 0,
  tempColor,
  onAdjustTemp,
}) {
  const [tv, setTv] = useState("");

  const applyTmp = (sign) => {
    const n = parseInt(tv || "1", 10);
    if (!isNaN(n) && n > 0 && onAdjustTemp) {
      onAdjustTemp(sign * n);
      setTv("");
    }
  };

  return (
    <div className="sbar" style={{ width: "48%" }}>
      <div className="sbar-hd">
        <span className="sbar-lbl">{label}</span>
        <div
          className="sbar-val"
          style={{ marginRight: "auto", paddingLeft: "10px" }}
        >
          {temp > 0 && <span style={{ color: tempColor }}>{temp}</span>}
        </div>
      </div>
      <div className="sbar-ctrls">
        {onAdjustTemp && (
          <div style={{ display: "contents", alignItems: "center" }}>
            <input
              className="sbar-in"
              type="number"
              placeholder="1"
              value={tv}
              style={{ borderColor: tempColor + "66" }}
              onChange={(e) => setTv(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyTmp(1);
              }}
            />
            <button
              className="btn btn-xs btn-icon"
              style={{
                background: tempColor + "25",
                color: tempColor,
                border: `1px solid ${tempColor}55`,
              }}
              onClick={() => applyTmp(1)}
            >
              +
            </button>
            <button
              className="btn btn-xs btn-icon"
              style={{
                background: "#ef444418",
                color: "#ef4444",
                border: "1px solid #ef444455",
              }}
              onClick={() => applyTmp(-1)}
            >
              −
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// ── StatusTags ─────────────────────────────────────────────────────────────────
const StatusTags = memo(function StatusTags({
  ids,
  onDrop,
  onRemove,
  anyDragging,
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`stags${over ? " dragover" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("sid");
        if (id) onDrop(id);
      }}
    >
      {ids.map((id) => {
        const s = STATUSES.find((x) => x.id === id);
        if (!s) return null;
        return (
          <span
            key={id}
            className="stag"
            style={{
              background: s.color + "20",
              borderColor: s.color,
              color: s.color,
            }}
            onClick={() => onRemove(id)}
            title={`Remover ${s.label}`}
          >
            {s.emoji} {s.label}
          </span>
        );
      })}
      {ids.length === 0 && anyDragging && (
        <span className="drag-hint">Solte aqui</span>
      )}
    </div>
  );
});

// ── PlayerCard ─────────────────────────────────────────────────────────────────
const PlayerCard = memo(function PlayerCard({
  p,
  onUpdate,
  onRemove,
  anyDragging,
  combat = false,
  isViewer = false,
}) {
  const u = (patch) => onUpdate({ ...p, ...patch });

  const adjHP = (delta) => {
    let { current, max, temp } = p.hp;
    if (delta < 0) {
      const dmg = -delta,
        ft = Math.min(temp, dmg);
      temp -= ft;
      current = clamp(current - (dmg - ft), 0, max);
    } else {
      current = clamp(current + delta, 0, max);
    }
    u({ hp: { ...p.hp, current, temp } });
  };

  const adjMP = (delta) => {
    let { current, max, temp } = p.mp;
    if (delta < 0) {
      const cost = -delta,
        ft = Math.min(temp, cost);
      temp -= ft;
      current = clamp(current - (cost - ft), 0, max);
    } else {
      current = clamp(current + delta, 0, max);
    }
    u({ mp: { ...p.mp, current, temp } });
  };

  return (
    <div className="card" style={{ position: "relative" }}>
      {!isViewer && (
        <button
          className="btn btn-ghost btn-xs btn-icon close-btn"
          onClick={onRemove}
        >
          ×
        </button>
      )}
      <div style={{ marginBottom: "10px", display: "block" }}>
        <span className="pname">{p.name}</span>
        <span className="pclasse">{p.classe}</span>
      </div>
      <StatBar
        label="PV"
        cur={p.hp.current}
        max={p.hp.max}
        temp={p.hp.temp}
        fillColor="#d72828"
        tempColor="#ff5e00"
        onAdjust={isViewer ? null : adjHP}
        onAdjustTemp={
          isViewer
            ? null
            : (d) => u({ hp: { ...p.hp, temp: Math.max(0, p.hp.temp + d) } })
        }
      />
      <StatBar
        label="PM"
        cur={p.mp.current}
        max={p.mp.max}
        temp={p.mp.temp}
        fillColor="#6366f1"
        tempColor="#22d3ee"
        onAdjust={isViewer ? null : adjMP}
        onAdjustTemp={
          isViewer
            ? null
            : (d) => u({ mp: { ...p.mp, temp: Math.max(0, p.mp.temp + d) } })
        }
      />
      {!combat && !isViewer && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <StatBarResumo
            label="Rações"
            temp={p.carga.temp}
            tempColor="#22c55e"
            onAdjustTemp={(d) =>
              u({ carga: { ...p.carga, temp: Math.max(0, p.carga.temp + d) } })
            }
          />
          <StatBarResumo
            label="Moedas"
            temp={p.ouro.temp}
            tempColor="#c5b122"
            onAdjustTemp={(d) =>
              u({ ouro: { ...p.ouro, temp: Math.max(0, p.ouro.temp + d) } })
            }
          />
        </div>
      )}
      {combat && (
        <StatusTags
          ids={p.statuses}
          onDrop={
            isViewer
              ? null
              : (id) => {
                  if (!p.statuses.includes(id))
                    u({ statuses: [...p.statuses, id] });
                }
          }
          onRemove={
            isViewer
              ? null
              : (id) => u({ statuses: p.statuses.filter((x) => x !== id) })
          }
          anyDragging={anyDragging && !isViewer}
        />
      )}
    </div>
  );
});

// ── EnemyCard ──────────────────────────────────────────────────────────────────
const EnemyCard = memo(function EnemyCard({
  e,
  onUpdate,
  onRemove,
  anyDragging,
  isViewer = false,
}) {
  const u = (patch) => onUpdate({ ...e, ...patch });
  const [dmg, setDmg] = useState("");

  const applyDmg = () => {
    const n = parseInt(dmg, 10);
    if (!isNaN(n)) {
      u({ hp: { ...e.hp, current: clamp(e.hp.current + n, 0, e.hp.max) } });
      setDmg("");
    }
  };

  const pct = clamp(e.hp.current / (e.hp.max || 1), 0, 1) * 100;
  const hpCol = pct > 60 ? "#ef4444" : pct > 30 ? "#f59e0b" : "#22c55e";

  return (
    <div className={`card ecard-${e.type}`} style={{ position: "relative" }}>
      {!isViewer && (
        <button
          className="btn btn-ghost btn-xs btn-icon close-btn"
          onClick={onRemove}
        >
          ×
        </button>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 9,
        }}
      >
        <span className={`ebadge ebadge-${e.type}`}>
          {e.type === "boss" ? "👑 Boss" : "⚔️ Mob"}
        </span>
        {!isViewer ? (
          <input
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text)",
              fontWeight: 600,
              fontSize: ".88rem",
            }}
            value={e.name}
            onChange={(ev) => u({ name: ev.target.value })}
            placeholder={e.type === "boss" ? "Nome do boss" : "Inimigo"}
          />
        ) : (
          <span style={{ flex: 1, fontWeight: 600 }}>{e.name}</span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: ".66rem",
            color: "var(--muted)",
            marginRight: "auto",
          }}
        >
          Dano Recebido {e.hp.current}
        </span>
      </div>
      <div className="sbar-track" style={{ marginBottom: 6 }}>
        <div
          className="sbar-fill"
          style={{ width: `${pct}%`, background: hpCol, borderRadius: "99px" }}
        />
      </div>
      {!isViewer && (
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <button
            className="btn btn-xs btn-icon"
            style={{ background: "#000000", color: "#fff" }}
            onClick={() => setDmg(String(Number(dmg) + 1))}
          >
            +1
          </button>
          <button
            className="btn btn-xs btn-icon"
            style={{ background: "#000000", color: "#fff" }}
            onClick={() => setDmg(String(Number(dmg) + 5))}
          >
            +5
          </button>
          <button
            className="btn btn-xs btn-icon"
            style={{ background: "#000000", color: "#fff" }}
            onClick={() => setDmg(String(Number(dmg) + 10))}
          >
            +10
          </button>
          <input
            className="sbar-in"
            type="number"
            min="1"
            placeholder="dano"
            value={dmg}
            onChange={(ev) => setDmg(ev.target.value)}
            onKeyDown={(ev) => ev.key === "Enter" && applyDmg()}
            style={{ width: 54 }}
          />
          <button className="btn btn-danger btn-xs" onClick={applyDmg}>
            Aplicar dano
          </button>
        </div>
      )}
      <StatusTags
        ids={e.statuses}
        onDrop={
          isViewer
            ? null
            : (id) => {
                if (!e.statuses.includes(id))
                  u({ statuses: [...e.statuses, id] });
              }
        }
        onRemove={
          isViewer
            ? null
            : (id) => u({ statuses: e.statuses.filter((x) => x !== id) })
        }
        anyDragging={anyDragging && !isViewer}
      />
    </div>
  );
});

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mbox">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div className="mbox-title">{title}</div>
          <button className="btn btn-ghost btn-xs btn-icon" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AddPlayerModal ─────────────────────────────────────────────────────────────
function AddPlayerModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [classe, setClasse] = useState("");
  const [hp, setHp] = useState("20");
  const [mp, setMp] = useState("10");
  const [carga, setCarga] = useState("0");
  const [ouro, setOuro] = useState("0");

  const ok = () => {
    if (!name.trim()) return;
    const hpValue = parseInt(hp) || 20;
    const mpValue = parseInt(mp) || 0;
    const cargaValue = parseInt(carga) || 0;
    const ouroValue = parseInt(ouro) || 0;
    onAdd({
      id: uid(),
      name: name.trim(),
      classe: classe.trim(),
      hp: { current: hpValue, max: hpValue, temp: 0 },
      mp: { current: mpValue, max: mpValue, temp: 0 },
      carga: { temp: cargaValue },
      ouro: { temp: ouroValue },
      statuses: [],
    });
    onClose();
  };

  return (
    <Modal title="Novo Personagem" onClose={onClose}>
      <div className="fg">
        <label className="fl">Nome</label>
        <input
          className="fi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Aethelred"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && ok()}
        />
      </div>
      <div className="fg">
        <label className="fl">Classe</label>
        <input
          className="fi"
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          placeholder="Ex.: Paladino"
          onKeyDown={(e) => e.key === "Enter" && ok()}
        />
      </div>
      <div className="frow">
        <div className="fg">
          <label className="fl">PV máx.</label>
          <input
            className="fi"
            type="number"
            min="1"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>
        <div className="fg">
          <label className="fl">PM máx.</label>
          <input
            className="fi"
            type="number"
            min="0"
            value={mp}
            onChange={(e) => setMp(e.target.value)}
          />
        </div>
        <div className="fg">
          <label className="fl">Rações</label>
          <input
            className="fi"
            type="number"
            min="0"
            value={carga}
            onChange={(e) => setCarga(e.target.value)}
          />
        </div>
        <div className="fg">
          <label className="fl">Moedas</label>
          <input
            className="fi"
            type="number"
            min="0"
            value={ouro}
            onChange={(e) => setOuro(e.target.value)}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 6,
        }}
      >
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={ok}
          disabled={!name.trim()}
        >
          Adicionar
        </button>
      </div>
    </Modal>
  );
}

// ── AddEnemyModal ──────────────────────────────────────────────────────────────
function AddEnemyModal({ onAdd, onClose }) {
  const [type, setType] = useState("mob");
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [v, setV] = useState("1");

  const ok = () => {
    const h = parseInt(hp) || (type === "boss" ? 100 : 20);
    const quantity = parseInt(v) || 1;
    for (let i = 1; i <= quantity; i++) {
      const n = quantity > 1 ? " (" + i + ")" : "";
      const nm = name.trim() || (type === "boss" ? "Boss" : "Inimigo");
      onAdd({
        id: uid(),
        type,
        name: nm + n,
        hp: { current: 0, max: h },
        statuses: [],
      });
    }
    onClose();
  };

  const apply = (sign) => {
    const newVal = parseInt(v) + sign;
    if (newVal > 0) setV(String(newVal));
  };

  return (
    <Modal title="Adicionar Inimigo" onClose={onClose}>
      <div className="fg" style={{ flex: "in-line" }}>
        <label className="fl">Tipo</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            ["mob", "⚔️ Mob"],
            ["boss", "👑 Boss"],
          ].map(([t, l]) => (
            <button
              key={t}
              className={`btn ${type === t ? "btn-danger" : "btn-ghost"}`}
              onClick={() => setType(t)}
            >
              {l}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-xs btn-icon"
            onClick={() => apply(-1)}
          >
            −
          </button>
          <input
            className="sbar-in"
            type="number"
            placeholder="1"
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(1);
              if (e.key === "-") {
                e.preventDefault();
                apply(-1);
              }
            }}
          />
          <button
            className="btn btn-ghost btn-xs btn-icon"
            onClick={() => apply(1)}
          >
            +
          </button>
        </div>
      </div>
      <div className="fg">
        <label className="fl">Nome (opcional)</label>
        <input
          className="fi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "boss" ? "Nome do boss" : "Inimigo"}
          autoFocus
        />
      </div>
      <div className="fg">
        <label className="fl">PV máx.</label>
        <input
          className="fi"
          type="number"
          min="1"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ok()}
          placeholder={type === "boss" ? "100" : "20"}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 6,
        }}
      >
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn btn-danger" onClick={ok}>
          Adicionar
        </button>
      </div>
    </Modal>
  );
}

// ── StatusFooter ───────────────────────────────────────────────────────────────
const StatusFooter = memo(function StatusFooter({ onDragStart, onDragEnd }) {
  return (
    <div className="sfooter">
      <span className="sfooter-lbl">Status — arraste:</span>
      {STATUSES.map((s) => (
        <span
          key={s.id}
          className="spill"
          style={{
            background: s.color + "20",
            borderColor: s.color,
            color: s.color,
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("sid", s.id);
            onDragStart(s.id);
          }}
          onDragEnd={onDragEnd}
          title={`Arraste para um card: ${s.label}`}
        >
          {s.emoji} {s.label}
        </span>
      ))}
    </div>
  );
});

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [addPlayer, setAddPlayer] = useState(false);
  const [addEnemy, setAddEnemy] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const {
    players,
    enemies,
    loading,
    syncStatus,
    savePlayer,
    deletePlayer,
    saveEnemy,
    deleteEnemy,
    setPlayers,
    setEnemies,
    saveInitiativeOrder,
    currentCampaign,
    campaigns,
    switchCampaign,
    addCampaign,
    isOwner,
    isViewer,
    combatMode,
    saveCombatMode,
    refreshCampaignsList,
  } = useSupabaseData(user?.id);

  // TODOS os useEffect DEVEM estar na mesma ordem sempre
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Processar convite via URL
  useEffect(() => {
    const processJoinCode = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const joinCode = urlParams.get("join");

      if (!joinCode) return;

      // Limpar URL sem recarregar
      window.history.replaceState({}, "", window.location.pathname);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        localStorage.setItem("pendingJoinCode", joinCode);
        return;
      }

      const { data: foundCampaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("share_code", joinCode.toUpperCase());

      if (foundCampaigns && foundCampaigns.length > 0) {
        const campaign = foundCampaigns[0];

        const { data: existingMember } = await supabase
          .from("campaign_members")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (!existingMember) {
          // Adicionar como membro viewer
          await supabase.from("campaign_members").insert({
            campaign_id: campaign.id,
            user_id: currentUser.id,
            role: "viewer",
          });

          // Recarregar a lista de campanhas
          if (refreshCampaignsList) {
            await refreshCampaignsList();
          }
        }

        // Trocar para a campanha
        await switchCampaign(campaign);

        // // Mostrar mensagem de sucesso
        // alert(
        //   `✅ Você entrou na campanha "${campaign.name}" como visualizador!`
        // );
      } else {
        alert("❌ Código inválido!");
      }
    };

    if (user) {
      processJoinCode();
    }
  }, [user, switchCampaign, refreshCampaignsList]);

  // Verificar código pendente após login
  useEffect(() => {
    const pendingCode = localStorage.getItem("pendingJoinCode");
    if (pendingCode && user) {
      localStorage.removeItem("pendingJoinCode");
      window.location.href = `/?join=${pendingCode}`;
    }
  }, [user]);

  useEffect(() => {
    console.log("⚔️ Modo Combate mudou para:", combatMode);
  }, [combatMode]);

  const updPlayer = (player) => {
    // setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
    savePlayer(player);
  };
  const delPlayer = async (id) => {
    const player = players.find((p) => p.id === id);
    if (window.confirm(`Deletar "${player?.name}"?`)) {
      // setPlayers((prev) => prev.filter((p) => p.id !== id));
      await deletePlayer(id);
    }
  };
  const updEnemy = (enemy) => {
    // setEnemies((prev) => prev.map((e) => (e.id === enemy.id ? enemy : e)));
    saveEnemy(enemy);
  };
  const delEnemy = async (id) => {
    const enemy = enemies.find((e) => e.id === id);
    if (window.confirm(`Deletar "${enemy?.name}"?`)) {
      // setEnemies((prev) => prev.filter((e) => e.id !== id));
      await deleteEnemy(id);
    }
  };

  const clearAllStatus = async () => {
    const hasStatus = players.some((p) => p.statuses?.length > 0);
    if (!hasStatus) return;
    const playersCleaned = players.map((p) => ({ ...p, statuses: [] }));
    setPlayers(playersCleaned);
    for (const player of playersCleaned) await savePlayer(player);
  };

  const handleCombatToggle = async (e) => {
    const isCombat = e.target.checked;
    if (!isCombat && enemies.length > 0) {
      if (
        window.confirm(
          `Sair do combate deletará ${enemies.length} inimigo(s). Confirmar?`
        )
      ) {
        const enemiesToDelete = [...enemies];
        setEnemies([]);
        for (const enemy of enemiesToDelete) await deleteEnemy(enemy.id);
        await clearAllStatus();
        await saveCombatMode(false);
      } else {
        e.target.checked = combatMode;
      }
    } else {
      await clearAllStatus();
      await saveCombatMode(isCombat);
    }
  };

  const addNewPlayer = async (player) => {
    // setPlayers((prev) => [...prev, player]);
    await savePlayer(player);
  };
  const addNewEnemy = async (enemy) => {
    // setEnemies((prev) => [...prev, enemy]);
    await saveEnemy(enemy);
  };
  const handleSaveInitiativeOrder = async (orderedParticipants) => {
    await saveInitiativeOrder(orderedParticipants);
  };
  const handleSwitchCampaign = async (campaign) => {
    // if (window.confirm(`Trocar para "${campaign.name}"?`))
    await switchCampaign(campaign);
  };
  const handleCampaignCreated = (newCampaign) => {
    addCampaign(newCampaign);
    switchCampaign(newCampaign);
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;
  if (loading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );

  return (
    <>
      <div className={`app ${combatMode ? "combat-mode" : "home-mode"}`}>
        <header className="header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1>⚔️ Tracker20</h1>
            <CampaignSwitcher
              campaigns={campaigns}
              currentCampaign={currentCampaign}
              onSwitchCampaign={handleSwitchCampaign}
              onCampaignCreated={handleCampaignCreated}
              isOwner={isOwner}
              isViewer={isViewer}
            />
            {/* <JoinCampaign /> */}

            {isOwner && (
              <button
                className="campaign-new-btn"
                onClick={() => setShowShareModal(true)}
              >
                🔗
              </button>
            )}
            {combatMode && <span className="combat-badge">⚔️ Combate</span>}
            {syncStatus === "saving" && (
              <span className="sync-status">💾 Salvando...</span>
            )}
            {syncStatus === "error" && (
              <span className="sync-status error">⚠️ Erro</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span className="user-email">{user.email}</span>
            <button className="btn btn-ghost btn-xs" onClick={handleLogout}>
              Sair
            </button>
            <div className="tgl-wrap">
              <span className="tgl-lbl">Modo Combate</span>
              <label className="tgl">
                <input
                  type="checkbox"
                  checked={combatMode}
                  onChange={handleCombatToggle}
                  disabled={isViewer}
                />
                <span className="tgl-s" />
              </label>
            </div>
          </div>
        </header>

        {showShareModal && currentCampaign && isOwner && (
          <ShareCampaign
            campaign={currentCampaign}
            onClose={() => setShowShareModal(false)}
          />
        )}

        <div className="main">
          {combatMode ? (
            <div className="combat-split">
              <div className="col-allies">
                <div className="sec-bar">
                  <span className="sec-title">🛡️ Aliados</span>
                  {!isViewer && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setAddPlayer(true)}
                    >
                      + Personagem
                    </button>
                  )}
                </div>
                <div className="card-grid">
                  {players.map((p) => (
                    <PlayerCard
                      key={p.id}
                      p={p}
                      onUpdate={updPlayer}
                      onRemove={() => delPlayer(p.id)}
                      anyDragging={!!dragging}
                      combat={combatMode}
                      isViewer={isViewer}
                    />
                  ))}
                </div>
              </div>
              <div className="col-enemies">
                <div className="sec-bar">
                  <span className="sec-title">💀 Inimigos</span>
                  {!isViewer && (
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={() => setAddEnemy(true)}
                    >
                      + Inimigo
                    </button>
                  )}
                </div>
                <div className="card-grid">
                  {enemies.map((e) => (
                    <EnemyCard
                      key={e.id}
                      e={e}
                      onUpdate={updEnemy}
                      onRemove={() => delEnemy(e.id)}
                      anyDragging={!!dragging}
                      isViewer={isViewer}
                    />
                  ))}
                </div>
              </div>
              <div className="col-initiative">
                <InitiativeList
                  players={players}
                  enemies={enemies}
                  onSaveOrder={handleSaveInitiativeOrder}
                  isViewer={isViewer}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="sec-bar">
                <span className="sec-title">🧙 Personagens</span>
                {!isViewer && (
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => setAddPlayer(true)}
                  >
                    + Personagem
                  </button>
                )}
              </div>
              <div className="card-grid">
                {players.map((p) => (
                  <PlayerCard
                    key={p.id}
                    p={p}
                    onUpdate={updPlayer}
                    onRemove={() => delPlayer(p.id)}
                    anyDragging={false}
                    combat={combatMode}
                    isViewer={isViewer}
                  />
                ))}
              </div>
              {players.length === 0 && (
                <div className="empty-message">
                  Nenhum personagem adicionado.
                </div>
              )}
            </>
          )}
        </div>

        {combatMode && !isViewer && (
          <StatusFooter
            onDragStart={(id) => setDragging(id)}
            onDragEnd={() => setDragging(null)}
          />
        )}
      </div>

      {addPlayer && (
        <AddPlayerModal
          onAdd={addNewPlayer}
          onClose={() => setAddPlayer(false)}
        />
      )}
      {addEnemy && (
        <AddEnemyModal onAdd={addNewEnemy} onClose={() => setAddEnemy(false)} />
      )}
    </>
  );
}
