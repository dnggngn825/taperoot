import { Provider } from 'urql';
import { client } from './lib/urql.ts';
import { AppShell } from './app/AppShell.tsx';

export default function App() {
  return (
    <Provider value={client}>
      <AppShell />
    </Provider>
  );
}
