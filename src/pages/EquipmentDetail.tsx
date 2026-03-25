import { useParams } from "react-router-dom";

export default function EquipmentDetail() {
  const { id } = useParams();

  return (
    <div style={{ padding: 24 }}>
      <h1>Equipment Detail</h1>
      <p>Equipment ID: {id}</p>

      <section><h2>General Information</h2></section>
      <section><h2>Status & Readiness</h2></section>
      <section><h2>Inventory</h2></section>
      <section><h2>Manufacturer</h2></section>
      <section><h2>Contacts</h2></section>
      <section><h2>Notes</h2></section>
    </div>
  );
}