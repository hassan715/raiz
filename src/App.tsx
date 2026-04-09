import AppShell from './components/layout/AppShell';
import Gateway from './components/auth/Gateway';
import VaultDashboard from './components/dashboard/VaultDashboard';
import { useVault } from './context/VaultContext';

function App() {
  const { lockVault } = useVault();

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
