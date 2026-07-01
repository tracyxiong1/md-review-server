import { useState, useEffect } from 'react';
import { DevModeApp } from './components/DevModeApp';
import { CliModeApp } from './components/CliModeApp';
import { useAnalytics } from './hooks/useAnalytics';

function App() {
  const [mode, setMode] = useState<'dev' | 'cli' | 'loading'>('loading');
  useAnalytics();

  useEffect(() => {
    // Detect mode by checking if /api/files endpoint is available
    const detectMode = async () => {
      try {
        const response = await fetch('/api/files');
        if (response.ok) {
          setMode('dev');
        } else {
          setMode('cli');
        }
      } catch {
        setMode('cli');
      }
    };

    detectMode();
  }, []);

  if (mode === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <p>Initializing...</p>
      </div>
    );
  }

  return mode === 'dev' ? <DevModeApp /> : <CliModeApp />;
}

export default App;
