export default function TopBar() {
  return (
    <div
      style={{
        height: 48,
        background: "#0f172a", // slate-900
        color: "#fff",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
      }}
    >
      {/* Logo placeholder */}
      <div
        style={{
          width: 28,
          height: 28,
          background: "#fff",
          borderRadius: 4,
        }}
      />

      <strong style={{ fontSize: 14 }}>
        Emergency Response Equipment Portal
      </strong>
    </div>
  );
}