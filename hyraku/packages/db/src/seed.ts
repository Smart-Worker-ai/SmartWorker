import { prisma } from './index.js';

// Kerala reference workers, carried over from the previous platform's seed set
// so the demo has a believable bench to assign from. Three are left pending on
// purpose — the approval queue is empty otherwise, and approving someone live
// is half the demo.

interface SeedWorker {
  name: string;
  trade: string;
  dailyRate: number;
  district: string;
  town: string;
  rating: number;
  totalReviews: number;
  experienceYears: number;
  status?: 'approved' | 'pending';
}

const WORKERS: SeedWorker[] = [
  { name: 'Suresh Nair',    trade: 'electrician',   dailyRate: 900,  district: 'Ernakulam',          town: 'Kochi',           rating: 4.8, totalReviews: 24, experienceYears: 10 },
  { name: 'Biju Thomas',    trade: 'plumber',       dailyRate: 800,  district: 'Ernakulam',          town: 'Kochi',           rating: 4.6, totalReviews: 18, experienceYears: 8 },
  { name: 'Rajan Menon',    trade: 'carpenter',     dailyRate: 1000, district: 'Ernakulam',          town: 'Kakkanad',        rating: 4.7, totalReviews: 21, experienceYears: 12 },
  { name: 'Manoj Kumar P',  trade: 'ac_technician', dailyRate: 1100, district: 'Ernakulam',          town: 'Edapally',        rating: 4.9, totalReviews: 30, experienceYears: 14 },
  { name: 'Santhosh V',     trade: 'painter',       dailyRate: 700,  district: 'Ernakulam',          town: 'Aluva',           rating: 4.2, totalReviews: 9,  experienceYears: 5 },
  { name: 'Jithin Raj',     trade: 'mason',         dailyRate: 950,  district: 'Ernakulam',          town: 'Angamaly',        rating: 4.4, totalReviews: 13, experienceYears: 7 },
  { name: 'Anoop K',        trade: 'electrician',   dailyRate: 850,  district: 'Ernakulam',          town: 'Thrippunithura',  rating: 4.3, totalReviews: 11, experienceYears: 6 },
  { name: 'Deepak Mohan',   trade: 'welder',        dailyRate: 1050, district: 'Ernakulam',          town: 'Perumbavoor',     rating: 4.5, totalReviews: 16, experienceYears: 9 },
  { name: 'Sreejith M',     trade: 'electrician',   dailyRate: 850,  district: 'Thiruvananthapuram', town: 'Technopark',      rating: 4.7, totalReviews: 22, experienceYears: 11 },
  { name: 'Unnikrishnan V', trade: 'plumber',       dailyRate: 750,  district: 'Thiruvananthapuram', town: 'Kazhakkoottam',   rating: 4.5, totalReviews: 15, experienceYears: 8 },
  { name: 'Harikrishnan T', trade: 'ac_technician', dailyRate: 1050, district: 'Thiruvananthapuram', town: 'Kesavadasapuram', rating: 4.6, totalReviews: 19, experienceYears: 10 },
  { name: 'Rajeev L',       trade: 'carpenter',     dailyRate: 950,  district: 'Thiruvananthapuram', town: 'Pettah',          rating: 4.3, totalReviews: 8,  experienceYears: 6 },
  { name: 'Binil S',        trade: 'painter',       dailyRate: 680,  district: 'Thiruvananthapuram', town: 'Vattiyoorkavu',   rating: 4.1, totalReviews: 7,  experienceYears: 4 },
  { name: 'Vinod Kumar',    trade: 'mason',         dailyRate: 900,  district: 'Thiruvananthapuram', town: 'Nemom',           rating: 4.4, totalReviews: 12, experienceYears: 8 },
  { name: 'Subin K',        trade: 'electrician',   dailyRate: 820,  district: 'Thrissur',           town: 'Thrissur Town',   rating: 4.5, totalReviews: 17, experienceYears: 9 },
  { name: 'Pramod T',       trade: 'plumber',       dailyRate: 770,  district: 'Thrissur',           town: 'Guruvayur',       rating: 4.3, totalReviews: 10, experienceYears: 6 },
  { name: 'Ajith Menon',    trade: 'carpenter',     dailyRate: 980,  district: 'Thrissur',           town: 'Chalakudy',       rating: 4.6, totalReviews: 20, experienceYears: 11 },
  { name: 'Bijeesh P',      trade: 'ac_technician', dailyRate: 1080, district: 'Thrissur',           town: 'Irinjalakuda',    rating: 4.4, totalReviews: 14, experienceYears: 8 },
  { name: 'Shijin K',       trade: 'electrician',   dailyRate: 800,  district: 'Kozhikode',          town: 'Kozhikode City',  rating: 4.4, totalReviews: 13, experienceYears: 7 },
  { name: 'Noushad P',      trade: 'plumber',       dailyRate: 720,  district: 'Kozhikode',          town: 'Vatakara',        rating: 4.2, totalReviews: 8,  experienceYears: 5 },
  { name: 'Arun S',         trade: 'painter',       dailyRate: 650,  district: 'Kozhikode',          town: 'Ramanattukara',   rating: 4.0, totalReviews: 6,  experienceYears: 4 },
  { name: 'Saji John',      trade: 'mason',         dailyRate: 920,  district: 'Kozhikode',          town: 'Feroke',          rating: 4.5, totalReviews: 15, experienceYears: 9 },
  { name: 'Tijo P',         trade: 'electrician',   dailyRate: 830,  district: 'Kottayam',           town: 'Kottayam Town',   rating: 4.3, totalReviews: 11, experienceYears: 7 },
  { name: 'Jose K',         trade: 'carpenter',     dailyRate: 970,  district: 'Kottayam',           town: 'Changanacherry',  rating: 4.7, totalReviews: 18, experienceYears: 10 },
  { name: 'Aneesh M',       trade: 'plumber',       dailyRate: 760,  district: 'Kottayam',           town: 'Pala',            rating: 4.4, totalReviews: 12, experienceYears: 7 },
  { name: 'Aravind P',      trade: 'ac_technician', dailyRate: 1000, district: 'Palakkad',           town: 'Palakkad Town',   rating: 4.5, totalReviews: 14, experienceYears: 8 },
  { name: 'Pradeep Babu',   trade: 'mason',         dailyRate: 880,  district: 'Palakkad',           town: 'Ottapalam',       rating: 4.2, totalReviews: 7,  experienceYears: 5 },
  { name: 'Riyas K',        trade: 'electrician',   dailyRate: 810,  district: 'Malappuram',         town: 'Manjeri',         rating: 4.3, totalReviews: 10, experienceYears: 6 },
  { name: 'Shafeeq T',      trade: 'plumber',       dailyRate: 740,  district: 'Malappuram',         town: 'Tirur',           rating: 4.1, totalReviews: 8,  experienceYears: 5 },
  { name: 'Robin Das',      trade: 'carpenter',     dailyRate: 930,  district: 'Kollam',             town: 'Chinnakada',      rating: 4.6, totalReviews: 16, experienceYears: 9 },
  { name: 'Manu V',         trade: 'painter',       dailyRate: 670,  district: 'Kollam',             town: 'Kadappakada',     rating: 4.0, totalReviews: 5,  experienceYears: 3 },
  { name: 'Dipin K',        trade: 'electrician',   dailyRate: 800,  district: 'Kannur',             town: 'Kannur Town',     rating: 4.4, totalReviews: 12, experienceYears: 7 },
  { name: 'Vineesh T',      trade: 'ac_technician', dailyRate: 1020, district: 'Kannur',             town: 'Thalassery',      rating: 4.5, totalReviews: 13, experienceYears: 8 },

  // Awaiting review — so the approval queue has something in it on day one.
  { name: 'Faisal Rahman',  trade: 'plumber',       dailyRate: 780,  district: 'Ernakulam',          town: 'Tripunithura',    rating: 0, totalReviews: 0, experienceYears: 6, status: 'pending' },
  { name: 'Sandeep Nair',   trade: 'electrician',   dailyRate: 870,  district: 'Ernakulam',          town: 'Vyttila',         rating: 0, totalReviews: 0, experienceYears: 9, status: 'pending' },
  { name: 'Rehana Beevi',   trade: 'painter',       dailyRate: 690,  district: 'Kollam',             town: 'Karunagappally',  rating: 0, totalReviews: 0, experienceYears: 4, status: 'pending' },
];

async function main() {
  const existing = await prisma.workerProfile.count();
  if (existing > 0) {
    console.log(`  Seed skipped — ${existing} workers already present.`);
    console.log('  Run `npm run db:reset` to rebuild from scratch.\n');
    return;
  }

  let n = 0;
  for (const w of WORKERS) {
    n++;
    const phone = `+9198470${String(10000 + n).slice(-5)}`;

    await prisma.user.create({
      data: {
        phone,
        name: w.name,
        whatsappOptIn: true,
        optInSource: 'seed',
        optInAt: new Date(),
        worker: {
          create: {
            workerUid: `HY-${String(n).padStart(6, '0')}`,
            trade: w.trade,
            district: w.district,
            town: w.town,
            serviceAreas: w.district,
            dailyRate: w.dailyRate,
            experienceYears: w.experienceYears,
            rating: w.rating,
            ratingSum: w.rating * w.totalReviews,
            totalReviews: w.totalReviews,
            status: w.status ?? 'approved',
            reviewedAt: w.status === 'pending' ? null : new Date(),
            acceptedTerms: true,
            acceptedTermsAt: new Date(),
            termsVersion: '2026-09-01',
          },
        },
      },
    });
  }

  const approved = WORKERS.filter((w) => w.status !== 'pending').length;
  console.log(`\n  Seeded ${WORKERS.length} workers — ${approved} approved, ${WORKERS.length - approved} awaiting review.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
