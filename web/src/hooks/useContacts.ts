import { useQuery } from 'urql';
import { CONTACTS_QUERY } from '../lib/queries.ts';
import type { ContactSummary, ContactSort } from '../types.ts';

/** Contacts list query, parameterised by sort order. */
export function useContacts(sort: ContactSort) {
  const [{ data, fetching, error }, refetch] = useQuery({ query: CONTACTS_QUERY, variables: { sort }, requestPolicy: 'cache-and-network' });
  const contacts: ContactSummary[] = data?.contacts ?? [];
  return { contacts, fetching, error, refetch };
}
