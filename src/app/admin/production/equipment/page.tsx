export default function EquipmentInventoryPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        border: '2px dashed var(--color-border-tertiary, #d1d5db)',
        borderRadius: '12px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '2rem auto'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏗️</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Equipment Inventory
        </h1>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
          Under Construction
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Master catalog of all SIGS photography and video gear with condition tracking.
        </p>
      </div>
    </div>
  );
}
