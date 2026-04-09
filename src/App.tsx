import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';

function App() {
  return (
    <Gateway>
      <AppShell>
        {/* We pass the lock function down in case we want to add a lock button in the header later */}
        <VaultDashboard />
      </AppShell>
    </Gateway>
  );
}

export default App;
