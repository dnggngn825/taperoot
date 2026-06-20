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
