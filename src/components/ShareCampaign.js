import React, { useState } from "react";
import { supabase } from "../supabase";

export default function ShareCampaign({ campaign, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?join=${campaign?.share_code}`;

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔗 Compartilhar Campanha</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p>
            <strong>{campaign?.name}</strong>
          </p>

          {/* <div className="share-code">
            <label>Código:</label>
            <div className="code-box">
              <code>{campaign?.share_code}</code>
              <button
                onClick={() => copyToClipboard(campaign?.share_code)}
                className="copy-btn"
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div> */}

          <div className="share-link">
            <label>Link:</label>
            <div className="link-box">
              <input type="text" value={shareUrl} readOnly />
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="copy-btn"
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>

          <div className="share-info">
            <p>
              📌 Quem entrar terá permissão de <strong>visualização</strong>
            </p>
            <p>👑 Apenas o dono pode editar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
