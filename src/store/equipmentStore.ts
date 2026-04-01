import { EQUIPMENT } from "../utils/equipment";

export type EquipmentItem = (typeof EQUIPMENT)[number] & {
  manufacturer?: string;
  contacts?: string[];
  notes?: string;
};

let equipmentState: EquipmentItem[] = EQUIPMENT.map(e => ({
  contacts: [],
  notes: "",
  manufacturer: "",
  ...e,
}));

export function getEquipmentById(id: number): EquipmentItem | null {
  return equipmentState.find(e => e.id === id) ?? null;
}

export function updateEquipment(updated: EquipmentItem) {
  equipmentState = equipmentState.map(e =>
    e.id === updated.id ? updated : e
  );
}

export function getAllEquipment() {
  return equipmentState;
}