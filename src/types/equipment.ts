export type EquipmentItem = {
  recordId: string;
  equipmentId: string;
  itemName: string;
  category: string;
  equipmentResourceType: string;

  deployableStatus: string;
  missionCapable: boolean;

  station: string;
  organizationName: string;

  quantity: number;
  unit: string;

  manufacturerMake: string;
  model: string;

  // Admin-only
  cost?: number;
  fairMarketValue?: number;
};