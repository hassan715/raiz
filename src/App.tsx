import AppShell from "./components/layout/AppShell";
import Gateway from "./components/auth/Gateway";
import { useVault } from "./context/VaultContext";

function App() {
  const { lockVault } = useVault();

  return (
    <Gateway>
      <AppShell>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-text-main">Welcome to Raiz</h2>
            
            {/* We can now safely test our lock function! */}
            <button 
              onClick={lockVault}
              className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-border transition-colors"
            >
              Lock Vault
            </button>
          </div>
          
          <p className="text-text-muted">
            Your vault is currently unlocked. The Rust backend is holding your DEK in active memory.
          </p>
        </div>
      </AppShell>
    </Gateway>
  );
}

export default App;