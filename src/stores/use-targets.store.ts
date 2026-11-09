import type { AddTargetInput, TargetTrader, UpdateTargetInput } from "@polymarket-copy/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api/http-client.ts";

export const useTargetsStore = defineStore("targets", () => {
  const targets = ref<TargetTrader[]>([]);
  const isLoading = ref(false);

  async function fetchTargets(): Promise<void> {
    isLoading.value = true;
    try {
      targets.value = await api.getTargets();
    } catch (err: unknown) {
      console.warn("[TargetsStore] Erreur chargement cibles:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function addTarget(dto: AddTargetInput): Promise<TargetTrader> {
    const created = await api.createTarget(dto);
    targets.value.unshift(created);
    return created;
  }

  async function toggleTarget(id: string, enabled: boolean): Promise<void> {
    const target = targets.value.find((t) => t.id === id);
    if (!target) return;

    target.enabled = enabled;
    try {
      await api.updateTarget(id, { enabled });
    } catch (err: unknown) {
      target.enabled = !enabled; // Rollback
      throw err;
    }
  }

  async function updateTarget(id: string, dto: UpdateTargetInput): Promise<void> {
    const updated = await api.updateTarget(id, dto);
    const index = targets.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      targets.value[index] = updated;
    }
  }

  async function removeTarget(id: string): Promise<void> {
    await api.deleteTarget(id);
    targets.value = targets.value.filter((t) => t.id !== id);
  }

  function handleTargetUpdated(updated: TargetTrader): void {
    const index = targets.value.findIndex((t) => t.id === updated.id);
    if (index !== -1) {
      targets.value[index] = updated;
    } else {
      targets.value.unshift(updated);
    }
  }

  return {
    targets,
    isLoading,
    fetchTargets,
    addTarget,
    toggleTarget,
    updateTarget,
    removeTarget,
    handleTargetUpdated,
  };
});
