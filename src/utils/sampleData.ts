import * as xlsx from 'xlsx';

export function downloadSampleExcel() {
  const sampleContacts = [
    {
      'Full Name': 'Liam Vance',
      'Work Email': 'liam.vance@techhorizon.com',
      'Company Name': 'TechHorizon Systems',
      City: 'San Francisco',
      Phone: '+1 (415) 555-0192',
      Category: 'Enterprise, Tech',
    },
    {
      'Full Name': 'Sophia Nakamura',
      'Work Email': 'sophia.n@quantumdynamics.org',
      'Company Name': 'Quantum Dynamics',
      City: 'Tokyo',
      Phone: '+81 3 5555 0144',
      Category: 'Tech, AI, VIP',
    },
    {
      'Full Name': 'Mateo Fernandez',
      'Work Email': 'm.fernandez@madridfintech.es',
      'Company Name': 'Madrid FinTech Labs',
      City: 'Madrid',
      Phone: '+34 91 555 0188',
      Category: 'Finance, Newsletter',
    },
    {
      'Full Name': 'Chloe Dubois',
      'Work Email': 'chloe@aerospacelyon.fr',
      'Company Name': 'Lyon Aerospace',
      City: 'Lyon',
      Phone: '+33 4 5555 0122',
      Category: 'Enterprise, Operations',
    },
    {
      'Full Name': 'Ethan Wright',
      'Work Email': 'ethan.wright@bounced-test-domain.com',
      'Company Name': 'Wright Consulting',
      City: 'Chicago',
      Phone: '+1 (312) 555-0177',
      Category: 'BouncedTest',
    },
    {
      'Full Name': 'Zoe Al-Mansoor',
      'Work Email': 'zoe@emiratescloud.ae',
      'Company Name': 'Emirates Cloud Services',
      City: 'Dubai',
      Phone: '+971 4 555 0166',
      Category: 'Cloud, Founder, VIP',
    },
    {
      'Full Name': 'Benjamin Brooks',
      'Work Email': 'bbrooks@greenenergyglobal.com',
      'Company Name': 'Green Energy Global',
      City: 'Austin',
      Phone: '+1 (512) 555-0133',
      Category: 'CleanTech, Newsletter',
    },
    {
      'Full Name': 'Hanna Lindqvist',
      'Work Email': 'hanna@nordicdesign.se',
      'Company Name': 'Nordic Design Studio',
      City: 'Stockholm',
      Phone: '+46 8 555 0199',
      Category: 'Design, Product',
    },
  ];

  const worksheet = xlsx.utils.json_to_sheet(sampleContacts);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sample_Subscribers');

  // Generate buffer and trigger download
  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'AutoMail_Sample_Contacts.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSampleCsv() {
  const csvContent = `Full Name,Work Email,Company Name,City,Phone,Category
Liam Vance,liam.vance@techhorizon.com,TechHorizon Systems,San Francisco,+1 (415) 555-0192,"Enterprise, Tech"
Sophia Nakamura,sophia.n@quantumdynamics.org,Quantum Dynamics,Tokyo,+81 3 5555 0144,"Tech, AI, VIP"
Mateo Fernandez,m.fernandez@madridfintech.es,Madrid FinTech Labs,Madrid,+34 91 555 0188,"Finance, Newsletter"
Chloe Dubois,chloe@aerospacelyon.fr,Lyon Aerospace,Lyon,+33 4 5555 0122,"Enterprise, Operations"
Ethan Wright,ethan.wright@bounced-test-domain.com,Wright Consulting,Chicago,+1 (312) 555-0177,"BouncedTest"
Zoe Al-Mansoor,zoe@emiratescloud.ae,Emirates Cloud Services,Dubai,+971 4 555 0166,"Cloud, Founder, VIP"
Benjamin Brooks,bbrooks@greenenergyglobal.com,Green Energy Global,Austin,+1 (512) 555-0133,"CleanTech, Newsletter"
Hanna Lindqvist,hanna@nordicdesign.se,Nordic Design Studio,Stockholm,+46 8 555 0199,"Design, Product"`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'AutoMail_Sample_Contacts.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const diff = (Date.now() - date.getTime()) / 1000;

  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
