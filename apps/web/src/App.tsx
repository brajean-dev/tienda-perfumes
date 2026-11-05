import { HealthStatus } from './features/health/HealthStatus';

export function App() {
  return (
    <>
      <header className="site-header">
        <h1>Tienda de perfumes</h1>
      </header>
      <main>
        <HealthStatus />
      </main>
    </>
  );
}
