export const CONTACTS_QUERY = `
  query Contacts($sort: ContactSort) {
    contacts(sort: $sort) {
      id
      name
      company
      role
      email
      aiStatus
      openFollowupCount
      lastActivityAt
    }
  }
`;

export const CONTACT_QUERY = `
  query Contact($id: ID!) {
    contact(id: $id) {
      id
      name
      company
      role
      email
      aiStatus
      openFollowupCount
      lastActivityAt
      notes { id body noteDate origin sourceConvoId }
      conversations { id summary transcript convoDate speakerCount }
      followups { id description dueDate status sourceType origin sourceId }
    }
  }
`;

export const GENERATE_MUTATION = `
  mutation Generate($contactId: ID!) {
    generateForContact(contactId: $contactId) { id aiStatus }
  }
`;

export const ADD_NOTE_MUTATION = `
  mutation AddNote($contactId: ID!, $body: String!, $noteDate: String!) {
    addNote(contactId: $contactId, body: $body, noteDate: $noteDate) { id }
  }
`;

export const UPDATE_NOTE_MUTATION = `
  mutation UpdateNote($id: ID!, $body: String) {
    updateNote(id: $id, body: $body) { id body }
  }
`;

export const UPDATE_FOLLOWUP_MUTATION = `
  mutation UpdateFollowup($id: ID!, $status: String, $description: String) {
    updateFollowup(id: $id, status: $status, description: $description) { id status description }
  }
`;

export const ADD_CONVERSATION_MUTATION = `
  mutation AddConversation($contactId: ID!, $rawTranscript: String!, $convoDate: String!) {
    addConversation(contactId: $contactId, rawTranscript: $rawTranscript, convoDate: $convoDate) { id }
  }
`;
