import { createContext, useContext, type ReactNode } from 'react';
import { useContacts } from '../hooks/useContacts.ts';
import type { ContactSummary } from '../types.ts';

interface ContactsContextValue {
  contacts: ContactSummary[];
  fetching: boolean;
  error: unknown;
  refetch: () => void;
}

const ContactsContext = createContext<ContactsContextValue | null>(null);

export function ContactsProvider({ children }: { children: ReactNode }) {
  const value = useContacts('recent_update');
  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function useContactsContext(): ContactsContextValue {
  const ctx = useContext(ContactsContext);
  if (!ctx) throw new Error('useContactsContext must be used inside ContactsProvider');
  return ctx;
}
