import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding KovaaLab CRM database...');

  await prisma.botSession.deleteMany();
  await prisma.formResponse.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.person.deleteMany();
  await prisma.company.deleteMany();
  await prisma.form.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: 'KovaaLab Default', slug: 'kovaa-lab' }
  });
  console.log(`Workspace created: ${workspace.id}`);

  await prisma.person.create({
    data: {
      workspaceId: workspace.id,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      stage: 'new',
      tags: ['webinar', 'hot-lead'],
    }
  });
  console.log('Person: Jean Dupont');

  await prisma.company.create({
    data: {
      workspaceId: workspace.id,
      name: 'KovaaLab SAS',
      website: 'https://kovaa-lab.fr',
      industry: 'SaaS CRM',
      employees: 25,
    }
  });
  console.log('Company: KovaaLab SAS');

  await prisma.form.create({
    data: {
      workspaceId: workspace.id,
      title: 'Formulaire de contact',
      questions: {
        create: [
          { label: 'Nom complet', type: 'text', required: true, order: 1 },
          { label: 'Email', type: 'email', required: true, order: 2 },
          { label: 'Téléphone', type: 'phone', required: false, order: 3 },
          { label: 'Message', type: 'textarea', required: true, order: 4 },
        ]
      }
    }
  });
  console.log('Form created with 4 questions');

  await prisma.calendarEvent.create({
    data: {
      workspaceId: workspace.id,
      title: 'Présentation produit',
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 86400000 + 3600000),
      location: 'Visioconférence',
      type: 'meeting',
    }
  });
  console.log('Calendar event created');

  console.log('Database seeded successfully!');
}

seed().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
