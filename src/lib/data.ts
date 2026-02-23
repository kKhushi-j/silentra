export type NoiseReference = {
  category: string;
  environments: {
    name: string;
    day: number;
    night: number;
    complianceNote: string;
  }[];
};

export const noiseReferenceData: NoiseReference[] = [
  {
    category: 'Healthcare',
    environments: [
      {
        name: 'ICU',
        day: 45,
        night: 35,
        complianceNote: 'WHO recommends below 35 dB average to ensure patient comfort and recovery.',
      },
      {
        name: 'Patient Ward',
        day: 40,
        night: 30,
        complianceNote: 'Levels should be kept low to promote healing and rest.',
      },
      {
        name: 'Hospital Corridor',
        day: 50,
        night: 40,
        complianceNote: 'High traffic area, but noise should be minimized to avoid disturbing rooms.',
      },
    ],
  },
  {
    category: 'Educational',
    environments: [
      {
        name: 'Library',
        day: 35,
        night: 35,
        complianceNote: 'Quiet is essential for concentration and study.',
      },
      {
        name: 'Classroom',
        day: 55,
        night: 55,
        complianceNote: 'Clear communication requires low background noise.',
      },
      {
        name: 'Cafeteria',
        day: 70,
        night: 70,
        complianceNote: 'High activity expected, but excessive noise can be stressful.',
      },
    ],
  },
  {
    category: 'Public & Administrative',
    environments: [
      {
        name: 'Open-Plan Office',
        day: 50,
        night: 50,
        complianceNote: 'Acoustic design is crucial to manage distractions and ensure productivity.',
      },
      {
        name: 'Private Office',
        day: 40,
        night: 40,
        complianceNote: 'Ideal for focused work and confidential conversations.',
      },
      {
        name: 'Museum',
        day: 45,
        night: 45,
        complianceNote: 'A quiet atmosphere enhances the visitor experience.',
      },
    ],
  },
  {
    category: 'Religious',
    environments: [
        {
            name: 'Place of Worship',
            day: 40,
            night: 40,
            complianceNote: 'Serenity and clarity of speech are paramount during services.',
        },
    ]
  },
];
