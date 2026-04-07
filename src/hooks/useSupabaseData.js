import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export function useSupabaseData(userId) {
  const [players, setPlayers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("saved");
  const [currentCampaign, setCurrentCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [userRole, setUserRole] = useState(null);

  // ============================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================

  const loadCampaignData = useCallback(async (campaignId) => {
    if (!campaignId) return;

    console.log("Carregando dados da campanha:", campaignId);
    setLoading(true);

    // Carregar players
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("campaign_id", campaignId);

    if (playersError) {
      console.error("Erro ao carregar players:", playersError);
    } else if (playersData) {
      setPlayers(playersData);
    }

    // Carregar enemies
    const { data: enemiesData, error: enemiesError } = await supabase
      .from("enemies")
      .select("*")
      .eq("campaign_id", campaignId);

    if (enemiesError) {
      console.error("Erro ao carregar enemies:", enemiesError);
    } else if (enemiesData) {
      setEnemies(enemiesData);
    }

    setLoading(false);
  }, []);

  const loadUserRole = useCallback(
    async (campaignId) => {
      if (!userId || !campaignId) return "viewer";

      const { data, error } = await supabase
        .from("campaign_members")
        .select("role")
        .eq("campaign_id", campaignId)
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Erro ao carregar papel:", error);
        return "viewer";
      }

      setUserRole(data?.role || "viewer");
      return data?.role || "viewer";
    },
    [userId]
  );

  const createDefaultCampaign = useCallback(async () => {
    if (!userId) return null;

    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: "Minha Campanha",
        owner_id: userId,
        share_code: shareCode,
        settings: { combat_mode: false },
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar campanha:", error);
      return null;
    }

    await supabase.from("campaign_members").insert({
      campaign_id: data.id,
      user_id: userId,
      role: "owner",
    });

    return data;
  }, [userId]);

  const loadUserCampaigns = useCallback(async () => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from("campaign_members")
      .select("campaign_id, campaigns(*)")
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao carregar campanhas:", error);
      return [];
    }

    const userCampaigns = data.map((item) => item.campaigns);
    setCampaigns(userCampaigns);

    if (userCampaigns.length === 0) {
      const newCampaign = await createDefaultCampaign();
      if (newCampaign) {
        setCampaigns([newCampaign]);
        return [newCampaign];
      }
    }

    return userCampaigns;
  }, [userId, createDefaultCampaign]);

  const switchCampaign = useCallback(
    async (campaign) => {
      setCurrentCampaign(campaign);
      setLoading(true);
      await loadUserRole(campaign.id);
      await loadCampaignData(campaign.id);
      setLoading(false);
    },
    [loadCampaignData, loadUserRole]
  );

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const userCampaigns = await loadUserCampaigns();

        if (!isMounted) return;

        if (userCampaigns.length > 0) {
          const campaignToUse = userCampaigns[0];
          setCurrentCampaign(campaignToUse);
          await loadUserRole(campaignToUse.id);
          await loadCampaignData(campaignToUse.id);
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [userId, loadUserCampaigns, loadCampaignData, loadUserRole]);

  // ============================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================

// No useEffect do Realtime, adicione mais uma subscription:

useEffect(() => {
  if (!currentCampaign) return;

  console.log("🔌 Conectando ao Realtime para campanha:", currentCampaign.id);

  const channel = supabase.channel(`campaign-${currentCampaign.id}`);

  // Subscription para players
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "players",
      filter: `campaign_id=eq.${currentCampaign.id}`,
    },
    (payload) => {
      console.log("📦 Realtime - Players:", payload.eventType);
      if (payload.eventType === "INSERT") {
        setPlayers((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.new.id ? payload.new : p))
        );
      } else if (payload.eventType === "DELETE") {
        setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
      }
    }
  );

  // Subscription para enemies
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "enemies",
      filter: `campaign_id=eq.${currentCampaign.id}`,
    },
    (payload) => {
      console.log("📦 Realtime - Enemies:", payload.eventType);
      if (payload.eventType === "INSERT") {
        setEnemies((prev) => [...prev, payload.new]);
      } else if (payload.eventType === "UPDATE") {
        setEnemies((prev) =>
          prev.map((e) => (e.id === payload.new.id ? payload.new : e))
        );
      } else if (payload.eventType === "DELETE") {
        setEnemies((prev) => prev.filter((e) => e.id !== payload.old.id));
      }
    }
  );

  // ⭐ ADICIONE ESTA SUBSCRIPTION PARA CAMPANHAS ⭐
  channel.on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "campaigns",
      filter: `id=eq.${currentCampaign.id}`,
    },
    (payload) => {
      console.log("📦 Realtime - Campaign:", payload.eventType, payload.new);
      // Atualizar o modo combate
      setCurrentCampaign(prev => ({
        ...prev,
        settings: payload.new.settings
      }));
    }
  );

  channel.subscribe((status) => {
    console.log("🔌 Realtime status:", status);
  });

  return () => {
    console.log("🔌 Desconectando do Realtime");
    channel.unsubscribe();
  };
}, [currentCampaign]);

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  const savePlayer = useCallback(
    async (player) => {
      if (!currentCampaign) return;

      setSyncStatus("saving");

      try {
        const playerData = {
          ...player,
          campaign_id: currentCampaign.id,
          updated_at: new Date(),
        };

        delete playerData.user_id;

        const { error } = await supabase
          .from("players")
          .upsert(playerData, { onConflict: "id" });

        if (error) {
          console.error("Erro ao salvar player:", error);
          setSyncStatus("error");
        } else {
          setSyncStatus("saved");
        }
      } catch (error) {
        console.error("Erro:", error);
        setSyncStatus("error");
      }
    },
    [currentCampaign]
  );

  const deletePlayer = useCallback(async (playerId) => {
    setSyncStatus("saving");

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (error) {
      console.error("Erro ao deletar player:", error);
      setSyncStatus("error");
    } else {
      setSyncStatus("saved");
    }
  }, []);

  const saveEnemy = useCallback(
    async (enemy) => {
      if (!currentCampaign) return;

      setSyncStatus("saving");

      try {
        const enemyData = {
          ...enemy,
          campaign_id: currentCampaign.id,
          updated_at: new Date(),
        };

        delete enemyData.user_id;

        const { error } = await supabase
          .from("enemies")
          .upsert(enemyData, { onConflict: "id" });

        if (error) {
          console.error("Erro ao salvar enemy:", error);
          setSyncStatus("error");
        } else {
          setSyncStatus("saved");
        }
      } catch (error) {
        console.error("Erro:", error);
        setSyncStatus("error");
      }
    },
    [currentCampaign]
  );

  const deleteEnemy = useCallback(async (enemyId) => {
    setSyncStatus("saving");

    const { error } = await supabase.from("enemies").delete().eq("id", enemyId);

    if (error) {
      console.error("Erro ao deletar enemy:", error);
      setSyncStatus("error");
    } else {
      setSyncStatus("saved");
    }
  }, []);

  const saveInitiativeOrder = useCallback(
    async (orderedParticipants) => {
      if (!currentCampaign) return;

      setSyncStatus("saving");

      try {
        for (let i = 0; i < orderedParticipants.length; i++) {
          const participant = orderedParticipants[i];

          if (participant.type === "player") {
            await supabase
              .from("players")
              .update({ initiative_order: i })
              .eq("id", participant.id);
          } else {
            await supabase
              .from("enemies")
              .update({ initiative_order: i })
              .eq("id", participant.id);
          }
        }

        setSyncStatus("saved");
      } catch (error) {
        console.error("Erro ao salvar ordem:", error);
        setSyncStatus("error");
      }
    },
    [currentCampaign]
  );

  const saveCombatMode = useCallback(
    async (isCombat) => {
      if (!currentCampaign) return;

      // Atualizar localmente
      setCurrentCampaign((prev) => ({
        ...prev,
        settings: { ...prev?.settings, combat_mode: isCombat },
      }));

      try {
        const { error } = await supabase
          .from("campaigns")
          .update({ settings: { combat_mode: isCombat } })
          .eq("id", currentCampaign.id);

        if (error) {
          console.error("Erro ao salvar modo combate:", error);
          // Reverter se deu erro
          setCurrentCampaign((prev) => ({
            ...prev,
            settings: { ...prev?.settings, combat_mode: !isCombat },
          }));
        }
      } catch (error) {
        console.error("Erro:", error);
      }
    },
    [currentCampaign]
  );

  const refreshUserRole = useCallback(async () => {
    if (!currentCampaign || !userId) return;

    const { data, error } = await supabase
      .from("campaign_members")
      .select("role")
      .eq("campaign_id", currentCampaign.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setUserRole(data.role);
    }
  }, [currentCampaign, userId]);

  const refreshCampaignsList = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("campaign_members")
      .select("campaign_id, campaigns(*)")
      .eq("user_id", userId);

    if (!error && data) {
      const userCampaigns = data.map((item) => item.campaigns);
      setCampaigns(userCampaigns);
      return userCampaigns;
    }
    return [];
  }, [userId]);

  // ============================================
  // RETORNO
  // ============================================

  return {
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
    addCampaign: (campaign) => setCampaigns((prev) => [...prev, campaign]),
    userRole,
    isOwner: userRole === "owner",
    isEditor: userRole === "owner" || userRole === "editor",
    isViewer: userRole === "viewer",
    combatMode: currentCampaign?.settings?.combat_mode || false,
    saveCombatMode,
    refreshCampaignsList,
  };
}
