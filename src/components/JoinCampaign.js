import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";

export default function JoinCampaign({ onJoinSuccess }) {
  const [joinCode, setJoinCode] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalRoot, setModalRoot] = useState(null);

  useEffect(() => {
    // Criar um div para o modal no body se não existir
    let div = document.getElementById("join-modal-root");
    if (!div) {
      div = document.createElement("div");
      div.id = "join-modal-root";
      document.body.appendChild(div);
    }
    setModalRoot(div);
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError("Digite o código da campanha");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Você precisa estar logado");
        return;
      }

      const cleanCode = joinCode.trim().toUpperCase();

      const { data: campaigns, error: findError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("share_code", cleanCode);

      if (findError || !campaigns || campaigns.length === 0) {
        setError("Código inválido");
        return;
      }

      const campaign = campaigns[0];

      const { data: existingMember } = await supabase
        .from("campaign_members")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        setSuccess(`✅ Você já é membro da campanha "${campaign.name}"!`);
        setTimeout(() => {
          setShowModal(false);
          setJoinCode("");
          setSuccess("");
          if (onJoinSuccess) onJoinSuccess();
          window.location.reload();
        }, 1500);
        return;
      }

      const { error: joinError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          role: "viewer",
        });

      if (joinError) throw joinError;

      setSuccess(`✅ Você entrou na campanha "${campaign.name}"!`);

      setTimeout(() => {
        setShowModal(false);
        setJoinCode("");
        setSuccess("");
        if (onJoinSuccess) onJoinSuccess();
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Erro:", error);
      setError("Erro ao entrar na campanha");
    } finally {
      setLoading(false);
    }
  };

  const ModalContent = () => (
    <div className="join-modal-overlay" onClick={() => setShowModal(false)}>
      <div className="join-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="join-modal-header">
          <h3>🔗 Entrar em Campanha</h3>
          <button
            className="join-modal-close"
            onClick={() => setShowModal(false)}
          >
            ×
          </button>
        </div>

        <div className="join-modal-body">
          <p>Digite o código da campanha que você recebeu:</p>
          <input
            type="text"
            placeholder="Ex.: ABC123"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            className="join-code-input"
          />
          {error && <div className="join-error-message">{error}</div>}
          {success && <div className="join-success-message">{success}</div>}
        </div>

        <div className="join-modal-footer">
          <button
            className="join-btn-cancel"
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </button>
          <button
            className="join-btn-submit"
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "Entrando..." : "🔗 Entrar"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="btn btn-ghost btn-xs"
        onClick={() => setShowModal(true)}
      >
        🔗 Entrar
      </button>

      {showModal && modalRoot && createPortal(<ModalContent />, modalRoot)}
    </>
  );
}
