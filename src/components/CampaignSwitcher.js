import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";

export default function CampaignSwitcher({
  campaigns,
  currentCampaign,
  onSwitchCampaign,
  onCampaignCreated,
  isOwner,
  isViewer,
}) {
  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [modalRoot, setModalRoot] = useState(null);

  useEffect(() => {
    let div = document.getElementById("campaign-modal-root");
    if (!div) {
      div = document.createElement("div");
      div.id = "campaign-modal-root";
      document.body.appendChild(div);
    }
    setModalRoot(div);
  }, []);

  const createNewCampaign = async () => {
    if (!newCampaignName.trim()) {
      setError("Digite um nome para a campanha");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const user = (await supabase.auth.getUser()).data.user;

      const shareCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          name: newCampaignName.trim(),
          owner_id: user.id,
          share_code: shareCode,
          settings: { combat_mode: false },
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      const { error: memberError } = await supabase
        .from("campaign_members")
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      setShowModal(false);
      setNewCampaignName("");
      onCampaignCreated(campaign);
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;
    const selectedCampaign = campaigns.find((c) => c.id === selectedId);
    if (selectedCampaign && selectedCampaign.id !== currentCampaign?.id) {
      onSwitchCampaign(selectedCampaign);
    }
  };

  const ModalContent = () => (
    <div className="campaign-modal-overlay" onClick={() => setShowModal(false)}>
      <div
        className="campaign-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="campaign-modal-header">
          <h3>✨ Criar Nova Campanha</h3>
          <button
            className="campaign-modal-close"
            onClick={() => setShowModal(false)}
          >
            ×
          </button>
        </div>

        <div className="campaign-modal-body">
          <div className="campaign-form-group">
            <label>Nome da Campanha</label>
            <input
              type="text"
              placeholder="Ex.: Aventura em Valkaria"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && createNewCampaign()}
              className="campaign-modal-input"
            />
          </div>

          {error && <div className="campaign-modal-error">{error}</div>}
        </div>

        <div className="campaign-modal-footer">
          <button
            className="campaign-btn-cancel"
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </button>
          <button
            className="campaign-btn-submit"
            onClick={createNewCampaign}
            disabled={isCreating}
          >
            {isCreating ? "Criando..." : "✨ Criar Campanha"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="campaign-selector">
        <select
          className="campaign-select"
          value={currentCampaign?.id || ""}
          onChange={handleSelectChange}
        >
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>

        <button
          className="campaign-new-btn"
          onClick={() => setShowModal(true)}
          title="Nova Campanha"
        >
          ✨
        </button>

        <span className={`role-badge ${isOwner ? "owner" : "viewer"}`}>
          {isOwner ? "👑" : "👁️"}
        </span>
      </div>

      {showModal && modalRoot && createPortal(<ModalContent />, modalRoot)}
    </>
  );
}
