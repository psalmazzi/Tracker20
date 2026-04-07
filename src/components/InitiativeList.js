import React, { useState, memo, useEffect } from "react";

const InitiativeItem = memo(function InitiativeItem({
  participant,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
}) {
  const isPlayer = participant.type === "player";
  const hpPercent = isPlayer
    ? (participant.hp.current / participant.hp.max) * 100
    : ((participant.hp.max - participant.hp.current) / participant.hp.max) *
      100;

  const isDead = isPlayer
    ? participant.hp.current <= 0
    : participant.hp.current >= participant.hp.max;

  return (
    <div className={`initiative-item ${isDead ? "dead" : ""}`}>
      <div className="initiative-controls">
        <button
          className="btn-icon-small"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          title="Mover para cima"
        >
          ↑
        </button>
        <button
          className="btn-icon-small"
          onClick={() => onMoveDown(index)}
          disabled={index === totalCount - 1}
          title="Mover para baixo"
        >
          ↓
        </button>
      </div>

      <div className="initiative-info">
        <span className="initiative-name">
          {participant.type === "player" ? "🧙" : "👾"} {participant.name}
        </span>
        <div className="initiative-hp">
          <div className="hp-bar-container">
            <div
              className="hp-bar-fill"
              style={{
                width: `${Math.min(100, Math.max(0, hpPercent))}%`,
                background: isPlayer ? "#d72828" : "#f59e0b",
              }}
            />
          </div>
          <span className="hp-text">
            {isPlayer
              ? `${participant.hp.current}/${participant.hp.max} PV`
              : `${participant.hp.current}/${participant.hp.max} dano`}
          </span>
        </div>
      </div>
    </div>
  );
});

export default function InitiativeList({
  players,
  enemies,
  onReorder,
  onSaveOrder,
}) {
  // Combinar players e inimigos
  const createSortedList = (playersList, enemiesList) => {
    const all = [
      ...playersList.map((p) => ({
        ...p,
        type: "player",
        id: p.id,
        name: p.name,
        hp: p.hp,
        initiative_order: p.initiative_order || 0,
      })),
      ...enemiesList.map((e) => ({
        ...e,
        type: "enemy",
        id: e.id,
        name: e.name,
        hp: e.hp,
        initiative_order: e.initiative_order || 0,
      })),
    ];

    return all.sort(
      (a, b) => (a.initiative_order || 0) - (b.initiative_order || 0)
    );
  };

  const [participants, setParticipants] = useState(() =>
    createSortedList(players, enemies)
  );

  // Atualizar quando players/enemies mudarem
  useEffect(() => {
    const sorted = createSortedList(players, enemies);
    setParticipants(sorted);
  }, [players, enemies]);

  // Mover para cima
  const moveUp = (index) => {
    if (index > 0) {
      const newParticipants = [...participants];
      [newParticipants[index - 1], newParticipants[index]] = [
        newParticipants[index],
        newParticipants[index - 1],
      ];
      setParticipants(newParticipants);
      onReorder?.(newParticipants);

      if (onSaveOrder) {
        onSaveOrder(newParticipants);
      }
    }
  };

  // Mover para baixo
  const moveDown = (index) => {
    if (index < participants.length - 1) {
      const newParticipants = [...participants];
      [newParticipants[index + 1], newParticipants[index]] = [
        newParticipants[index],
        newParticipants[index + 1],
      ];
      setParticipants(newParticipants);
      onReorder?.(newParticipants);

      if (onSaveOrder) {
        onSaveOrder(newParticipants);
      }
    }
  };

  return (
    <div className="initiative-container">
      <div className="initiative-header">
        <h3>⚡ Ordem de Iniciativa</h3>
        <span className="initiative-count">
          {participants.length} participantes
        </span>
      </div>
      <div className="initiative-list">
        {participants.map((participant, index) => (
          <InitiativeItem
            key={participant.id}
            participant={participant}
            index={index}
            totalCount={participants.length}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
          />
        ))}
        {participants.length === 0 && (
          <div className="initiative-empty">
            Adicione personagens e inimigos para começar
          </div>
        )}
      </div>
    </div>
  );
}
