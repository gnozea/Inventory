import type { EquipmentItem } from "../types/equipment";

const MOCK_EQUIPMENT: EquipmentItem[] = [
  {
    recordId: "1",
    equipmentId: "EQ-001",
    itemName: "Thermal Imaging Camera",
    category: "Search & Rescue",
    equipmentResourceType: "Imaging",
    deployableStatus: "Available",
    missionCapable: true,
    station: "Station 12",
    organizationName: "Fire Dept",
    quantity: 4,
    unit: "Each",
    manufacturerMake: "FLIR",
    model: "K55",
    cost: 4500,
    fairMarketValue: 3800,
  },
];

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_EQUIPMENT;
}

export async function fetchEquipmentById(
  id: string
): Promise<EquipmentItem | undefined> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_EQUIPMENT.find((e) => e.equipmentId === id);
}