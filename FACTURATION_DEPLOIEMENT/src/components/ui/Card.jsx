export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-faso-card rounded-faso-lg shadow-card border border-faso-border p-6 ${className}`}>
      {children}
    </div>
  );
}
