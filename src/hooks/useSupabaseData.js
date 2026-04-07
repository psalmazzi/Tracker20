import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

export function useSupabaseData(userId) {
  const [players, setPlayers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("saved");
  const [combatMode, setCombatMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Carregar dados do Supabase
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);

      // Carregar players
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", userId);

      if (playersError) {
        console.error("Erro ao carregar players:", playersError);
      } else if (playersData) {
        setPlayers(
          playersData.map((p) => ({
            ...p,
            hp: p.hp,
            mp: p.mp,
            carga: p.carga,
            ouro: p.ouro,
            statuses: p.statuses || [],
            initiative_order: p.initiative_order_global || 0,
          }))
        );
      }

      // Carregar enemies
      const { data: enemiesData, error: enemiesError } = await supabase
        .from("enemies")
        .select("*")
        .eq("user_id", userId);

      if (enemiesError) {
        console.error("Erro ao carregar enemies:", enemiesError);
      } else if (enemiesData) {
        setEnemies(
          enemiesData.map((e) => ({
            ...e,
            initiative_order: e.initiative_order_global || 0,
          }))
        );
      }

      setLoading(false);
    };

    loadData();

    // Setup real-time subscriptions
    const playersSubscription = supabase
      .channel("players_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
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
      )
      .subscribe();

    const enemiesSubscription = supabase
      .channel("enemies_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enemies",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
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
      )
      .subscribe();

    return () => {
      playersSubscription.unsubscribe();
      enemiesSubscription.unsubscribe();
    };
  }, [userId]);

  const savePlayer = useCallback(
    async (player) => {
      if (!userId) {
        console.error("Usuário não autenticado");
        return;
      }

      setSyncStatus("saving");

      try {
        // Preparar os dados para o Supabase
        const playerData = {
          id: player.id,
          user_id: userId,
          name: player.name,
          classe: player.classe || "",
          hp: player.hp,
          mp: player.mp,
          carga: player.carga,
          ouro: player.ouro,
          statuses: player.statuses || [],
          initiative_order_global: player.initiative_order || 0,
          updated_at: new Date(),
        };

        const { error } = await supabase
          .from("players")
          .upsert(playerData, { onConflict: "id" });

        if (error) {
          console.error("Erro detalhado ao salvar player:", error);
          setSyncStatus("error");
          throw error;
        } else {
          setSyncStatus("saved");
          console.log("Player salvo com sucesso:", playerData);
        }
      } catch (error) {
        console.error("Erro ao salvar player:", error);
        setSyncStatus("error");
      }
    },
    [userId]
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
      setSyncStatus("saving");

      const { error } = await supabase.from("enemies").upsert({
        ...enemy,
        user_id: userId,
        initiative_order_global: enemy.initiative_order || 0,
        updated_at: new Date(),
      });

      if (error) {
        console.error("Erro ao salvar enemy:", error);
        setSyncStatus("error");
      } else {
        setSyncStatus("saved");
      }
    },
    [userId]
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
      if (!userId) return;

      setSyncStatus("saving");

      try {
        // Atualizar cada participante com sua posição global na lista
        for (let i = 0; i < orderedParticipants.length; i++) {
          const participant = orderedParticipants[i];

          if (participant.type === "player") {
            await supabase
              .from("players")
              .update({ initiative_order_global: i })
              .eq("id", participant.id);
          } else {
            await supabase
              .from("enemies")
              .update({ initiative_order_global: i })
              .eq("id", participant.id);
          }
        }

        setSyncStatus("saved");
        console.log("Ordem de iniciativa global salva");
      } catch (error) {
        console.error("Erro ao salvar ordem de iniciativa:", error);
        setSyncStatus("error");
      }
    },
    [userId]
  );

  // Função para carregar as configurações do usuário
  const loadUserSettings = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("combat_mode")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found
        console.error("Erro ao carregar configurações:", error);
        return;
      }

      if (data) {
        setCombatMode(data.combat_mode || false);
      }
      setSettingsLoaded(true);
    } catch (error) {
      console.error("Erro:", error);
      setSettingsLoaded(true);
    }
  }, [userId]);

  // Função para salvar o modo combate
  const saveCombatMode = useCallback(
    async (isCombat) => {
      if (!userId) return;

      try {
        const { error } = await supabase.from("user_settings").upsert(
          {
            user_id: userId,
            combat_mode: isCombat,
            updated_at: new Date(),
          },
          { onConflict: "user_id" }
        );

        if (error) {
          console.error("Erro ao salvar modo combate:", error);
        } else {
          console.log("Modo combate salvo:", isCombat);
        }
      } catch (error) {
        console.error("Erro:", error);
      }
    },
    [userId]
  );

  // Carregar configurações quando userId mudar
  useEffect(() => {
    if (userId) {
      loadUserSettings();
    }
  }, [userId, loadUserSettings]);

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
    combatMode,
    setCombatMode,
    settingsLoaded,
    saveCombatMode,
  };
}
