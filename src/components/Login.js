import React, { useState } from "react";
import { supabase } from "../supabase";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
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
          options: {
            data: {
              display_name: email.split("@")[0],
            },
          },
        });
        result = { data, error };

        if (data?.user && !data?.session) {
          setMessage(
            "✅ Cadastro realizado! Verifique seu email para confirmar."
          );
        }
      }

      if (result.error) {
        if (result.error.message === "Invalid login credentials") {
          throw new Error("Email ou senha incorretos");
        } else if (result.error.message.includes("Email not confirmed")) {
          throw new Error("Por favor, confirme seu email antes de fazer login");
        } else {
          throw new Error(result.error.message);
        }
      }

      if (isLogin && result.data?.session) {
        onLogin(result.data.user);
      } else if (!isLogin && result.data?.user && result.data.session) {
        onLogin(result.data.user);
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
      <div className="login-box">
        <div className="login-header">
          <div className="logo-container">
            <span className="logo-icon">⚔️</span>
            <h1 className="logo-text">Tracker20</h1>
            <span className="logo-icon">🎲</span>
          </div>
          <p className="logo-subtitle">Tormenta20 RPG Tracker</p>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">📧</span> Email
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="label-icon">🔒</span> Senha
            </label>
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

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="loading-spinner-small"></span>
            ) : (
              <>{isLogin ? "⚔️ Entrar na Aventura" : "🛡️ Criar Personagem"}</>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span className="divider-line"></span>
          <span className="divider-text">ou</span>
          <span className="divider-line"></span>
        </div>

        <button
          className="toggle-auth-btn"
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setMessage("");
          }}
        >
          {isLogin ? (
            <>
              <span>✨ Novo por aqui? </span>
              <strong>Criar conta gratuita</strong>
            </>
          ) : (
            <>
              <span>⚔️ Já tenho conta? </span>
              <strong>Fazer login</strong>
            </>
          )}
        </button>

        <div className="login-footer">
          <p>🎲 Tormenta20 © 2024</p>
          <p className="version">Tracker20 v1.0</p>
        </div>
      </div>
    </div>
  );
}
