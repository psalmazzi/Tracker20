import React, { useState } from "react";
import { supabase } from "../supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        result = { data, error };
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        result = { data, error };
      }

      if (result.error) {
        if (result.error.message === "Invalid login credentials") {
          throw new Error("Email ou senha incorretos");
        } else {
          throw new Error(result.error.message);
        }
      }

      if (result.data?.session) {
        onLogin(result.data.user);
      } else if (!isLogin && result.data?.user) {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (!signInError && signInData.session) {
          onLogin(signInData.user);
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background com gradiente vermelho/azul */}
      <div className="login-bg">
        <div className="bg-gradient"></div>
      </div>

      <div className="login-wrapper">
        {/* Painel de boas-vindas */}
        <div
          className={`welcome-panel ${
            isLogin ? "login-active" : "signup-active"
          }`}
        >
          <div className="welcome-content">
            <div className="welcome-icon">⚔️</div>
            <h2>Tracker20</h2>
            <p>
              O sistema rastreador mais
              <br />
              prático para seu RPG
            </p>
            <div className="welcome-features">
              <span>🎲 Controle de Combate</span>
              <span>📊 Status em Tempo Real</span>
              <span>⚡ Ordem de Iniciativa</span>
            </div>
          </div>
        </div>

        {/* Painel de formulário */}
        <div className="form-panel">
          <div className="form-container">
            <div className="form-header">
              <div className="form-tabs">
                <button
                  className={`tab-btn ${isLogin ? "active" : ""}`}
                  onClick={() => setIsLogin(true)}
                >
                  <span>🔐</span> Entrar
                </button>
                <button
                  className={`tab-btn ${!isLogin ? "active" : ""}`}
                  onClick={() => setIsLogin(false)}
                >
                  <span>✨</span> Criar Conta
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Senha</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`submit-btn ${isLogin ? "login-btn" : "signup-btn"}`}
              >
                {loading ? (
                  <span className="loading-spinner-small"></span>
                ) : (
                  <>{isLogin ? "⚔️ Entrar na Aventura" : "🛡️ Criar Conta"}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
