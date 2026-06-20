import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Transcript fixtures ─────────────────────────────────────────────────────

const transcript2Speaker = JSON.stringify([
  {
    speaker: 'Speaker 1',
    text: 'Great connecting with you at the fintech summit today, Alice. Your approach to SMB lending is really compelling.',
  },
  {
    speaker: 'Speaker 2',
    text: "Thanks! We're seeing strong traction. I'd love to share our latest deck — I'll send it over next week.",
  },
  {
    speaker: 'Speaker 1',
    text: "Please do. I'll also connect you with my colleague at Meridian Capital who covers fintech — they may want to co-invest.",
  },
  {
    speaker: 'Speaker 2',
    text: "That would be amazing. I'll follow up by Friday with the deck and our Q2 metrics.",
  },
  {
    speaker: 'Speaker 1',
    text: "Perfect. Let's find time for a deeper call in two weeks once you've reviewed everything.",
  },
  {
    speaker: 'Speaker 2',
    text: "I'll send a calendar invite next week. Really appreciate the connection.",
  },
]);

const transcript3Speaker = JSON.stringify([
  {
    speaker: 'Speaker 1',
    text: "Thanks for joining the call, everyone. Bob, I wanted to introduce you to our lead architect Marcus.",
  },
  {
    speaker: 'Speaker 2',
    text: "Great to meet you Marcus. Bob, your infrastructure platform sounds exactly like what we need to scale our data pipeline.",
  },
  {
    speaker: 'Speaker 3',
    text: "I'll put together a technical proposal by next week so we can evaluate the integration requirements.",
  },
  {
    speaker: 'Speaker 1',
    text: "That works. Bob, can you loop in your solutions engineer to review the proposal when it's ready?",
  },
  {
    speaker: 'Speaker 2',
    text: "Absolutely. I'll send the intro email today.",
  },
  {
    speaker: 'Speaker 3',
    text: "I'll have a draft ready by Thursday. We should plan a follow-up call in two weeks to go through it.",
  },
  {
    speaker: 'Speaker 1',
    text: "Let's schedule that now. I'll send a calendar invite for two weeks out.",
  },
]);

const transcriptConvoD1 = JSON.stringify([
  {
    speaker: 'Speaker 1',
    text: "David, good to finally connect. I heard great things about your work on distributed systems.",
  },
  {
    speaker: 'Speaker 2',
    text: "Thanks! I've been following your company's open-source work. I'd love to contribute — I'll look at the issues list this week.",
  },
  {
    speaker: 'Speaker 1',
    text: "Please do. I'll tag a few good first issues for you by tomorrow.",
  },
]);

const transcriptConvoD2 = JSON.stringify([
  {
    speaker: 'Speaker 1',
    text: "David, just checking in on the contribution you mentioned last time.",
  },
  {
    speaker: 'Speaker 2',
    text: "I opened a PR this morning — it should fix the race condition. I'll ping you when it passes CI, probably next week.",
  },
  {
    speaker: 'Speaker 1',
    text: "Perfect. I'll review it as soon as it's ready and loop in the core team.",
  },
]);

const transcriptConvoE = JSON.stringify([
  {
    speaker: 'Speaker 1',
    text: "Emma, your portfolio is stunning. We're definitely interested in working with you on the rebrand.",
  },
  {
    speaker: 'Speaker 2',
    text: "I'm excited about this too. I'll send a proposal with timeline and pricing by Wednesday.",
  },
  {
    speaker: 'Speaker 1',
    text: "Great. I need to share it with the board by Friday so I'll need it before then.",
  },
  {
    speaker: 'Speaker 2',
    text: "Understood — I'll have it in your inbox by Tuesday evening at the latest. I'll also include three concept directions.",
  },
  {
    speaker: 'Speaker 1',
    text: "Perfect. Once we align on direction, we'll need a kickoff call next week to go over brand guidelines.",
  },
  {
    speaker: 'Speaker 2',
    text: "I'll block time in my calendar next week and send you two or three options to pick from.",
  },
]);

// ── Main seed ───────────────────────────────────────────────────────────────

async function main() {
  // Wipe existing data so re-seeding is idempotent
  await prisma.followup.deleteMany();
  await prisma.note.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.user.deleteMany();

  // Owner user
  const owner = await prisma.user.create({
    data: { id: 'usr-owner', name: 'Danny Nguyen', email: 'danny@example.com' },
  });

  // ── Contact A: notes + 2-speaker convo ──────────────────────────────────
  const contactA = await prisma.contact.create({
    data: {
      id: 'cnt-alice',
      userId: owner.id,
      name: 'Alice Chen',
      company: 'LendBridge',
      role: 'CEO',
      email: 'alice@lendbridge.io',
    },
  });
  await prisma.note.createMany({
    data: [
      {
        id: 'note-alice-1',
        contactId: contactA.id,
        body: 'Met Alice at the fintech summit. Strong founder energy. Product targets underserved SMB segment.',
        noteDate: new Date('2026-06-15'),
        origin: 'manual',
      },
      {
        id: 'note-alice-2',
        contactId: contactA.id,
        body: "Followed up by email. She's raising a $3M seed — warm intro to Meridian Capital would be valuable.",
        noteDate: new Date('2026-06-18'),
        origin: 'manual',
      },
    ],
  });
  await prisma.conversation.create({
    data: {
      id: 'cnv-alice-1',
      contactId: contactA.id,
      convoDate: new Date('2026-06-15'),
      summary:
        'Intro meeting at fintech summit. Alice to send deck + Q2 metrics by Friday. Agreed on a deeper call in two weeks.',
      transcript: transcript2Speaker,
      speakerCount: 2,
    },
  });

  // ── Contact B: note + 3-speaker convo ──────────────────────────────────
  const contactB = await prisma.contact.create({
    data: {
      id: 'cnt-bob',
      userId: owner.id,
      name: 'Bob Martinez',
      company: 'Axiom Infra',
      role: 'VP Engineering',
      email: 'bob@axiominfra.com',
    },
  });
  await prisma.note.create({
    data: {
      id: 'note-bob-1',
      contactId: contactB.id,
      body: "Bob's team built the data pipeline infrastructure we evaluated last quarter. Strong technical depth.",
      noteDate: new Date('2026-06-12'),
      origin: 'manual',
    },
  });
  await prisma.conversation.create({
    data: {
      id: 'cnv-bob-1',
      contactId: contactB.id,
      convoDate: new Date('2026-06-12'),
      summary:
        'Three-way intro call. Marcus to prepare technical proposal by next week. Bob to intro solutions engineer by email today. Follow-up call in two weeks.',
      transcript: transcript3Speaker,
      speakerCount: 3,
    },
  });

  // ── Contact C: multiple notes only ──────────────────────────────────────
  const contactC = await prisma.contact.create({
    data: {
      id: 'cnt-carol',
      userId: owner.id,
      name: 'Carol Singh',
      company: 'Stripe',
      role: 'Product Manager',
      email: 'carol.singh@stripe.com',
    },
  });
  await prisma.note.createMany({
    data: [
      {
        id: 'note-carol-1',
        contactId: contactC.id,
        body: 'Met Carol at a PM roundtable. She manages the Stripe Dashboard product surface.',
        noteDate: new Date('2026-06-01'),
        origin: 'manual',
      },
      {
        id: 'note-carol-2',
        contactId: contactC.id,
        body: "Reconnected over coffee. She's interested in our analytics integration — should send her a demo link.",
        noteDate: new Date('2026-06-08'),
        origin: 'manual',
      },
      {
        id: 'note-carol-3',
        contactId: contactC.id,
        body: 'Carol asked about our roadmap for webhooks. Need to loop in our engineer next week.',
        noteDate: new Date('2026-06-17'),
        origin: 'manual',
      },
    ],
  });

  // ── Contact D: convos only, different days ───────────────────────────────
  const contactD = await prisma.contact.create({
    data: {
      id: 'cnt-david',
      userId: owner.id,
      name: 'David Kim',
      company: 'Independent',
      role: 'Senior Engineer',
      email: 'david.kim@gmail.com',
    },
  });
  await prisma.conversation.createMany({
    data: [
      {
        id: 'cnv-david-1',
        contactId: contactD.id,
        convoDate: new Date('2026-06-05'),
        summary:
          'Initial intro. David interested in contributing to open source. Will look at issues this week. Owner to tag good first issues by tomorrow.',
        transcript: transcriptConvoD1,
        speakerCount: 2,
      },
      {
        id: 'cnv-david-2',
        contactId: contactD.id,
        convoDate: new Date('2026-06-16'),
        summary:
          'Follow-up on contribution. David opened a PR fixing the race condition. Will ping when CI passes next week. Owner to review and loop in core team.',
        transcript: transcriptConvoD2,
        speakerCount: 2,
      },
    ],
  });

  // ── Contact E: 1 convo with strong commitments ───────────────────────────
  const contactE = await prisma.contact.create({
    data: {
      id: 'cnt-emma',
      userId: owner.id,
      name: 'Emma Wilson',
      company: 'Wilson Studio',
      role: 'Brand Designer',
      email: 'emma@wilsonstudio.co',
    },
  });
  await prisma.conversation.create({
    data: {
      id: 'cnv-emma-1',
      contactId: contactE.id,
      convoDate: new Date('2026-06-19'),
      summary:
        "Design kickoff. Emma to send proposal with timeline and pricing by Tuesday. Owner needs it before Friday board meeting. Kickoff call to be scheduled next week after direction is agreed.",
      transcript: transcriptConvoE,
      speakerCount: 2,
    },
  });

  // ── Contact F: no notes, no convos (eligibility negative) ────────────────
  await prisma.contact.create({
    data: {
      id: 'cnt-frank',
      userId: owner.id,
      name: 'Frank Lee',
      company: 'Stealth',
      role: 'Co-founder',
      email: 'frank@stealth.io',
    },
  });

  console.log('✅ Seed complete:');
  console.log('   1 owner user');
  console.log('   6 contacts (A–F)');
  console.log('   A: 2 notes + 1 × 2-speaker convo');
  console.log('   B: 1 note  + 1 × 3-speaker convo');
  console.log('   C: 3 notes + 0 convos');
  console.log('   D: 0 notes + 2 convos (different days)');
  console.log('   E: 0 notes + 1 convo (strong commitments)');
  console.log('   F: 0 notes + 0 convos  ← eligibility negative');
  console.log('   followups: 0 (none generated yet)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
