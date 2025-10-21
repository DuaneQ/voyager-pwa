#!/bin/bash
# Quick diagnostic: Check if test data exists in database

echo "🔍 Checking test data in traval-dev database..."
echo ""

# Make sure proxy is running
if ! pgrep -f "cloud_sql_proxy.*traval-dev" > /dev/null; then
    echo "⚠️  Cloud SQL proxy not running. Starting it..."
    ./cloud_sql_proxy -instances=mundo1-dev:us-central1:traval-dev=tcp:5432 &
    sleep 3
fi

echo "📊 Counting test itineraries in database..."
export DATABASE_URL="postgresql://voyageruser:TravalPassWins1_@127.0.0.1:5432/traval-dev"

npx ts-node -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Count all test itineraries
    const totalCount = await prisma.itinerary.count({
      where: { id: { startsWith: 'test-' } }
    });
    console.log(\`   Total test itineraries: \${totalCount}\`);
    
    // Count by destination
    const miamiCount = await prisma.itinerary.count({
      where: { 
        id: { startsWith: 'test-' },
        destination: 'Miami, FL, USA'
      }
    });
    console.log(\`   Miami itineraries: \${miamiCount}\`);
    
    // Show sample of Miami itineraries
    const samples = await prisma.itinerary.findMany({
      where: { 
        id: { startsWith: 'test-' },
        destination: 'Miami, FL, USA'
      },
      take: 5,
      select: {
        id: true,
        destination: true,
        age: true,
        gender: true,
        status: true,
        sexualOrientation: true,
        startDate: true,
        endDate: true
      }
    });
    
    console.log(\`\\n   Sample Miami itineraries:\`);
    samples.forEach(s => {
      console.log(\`     - \${s.id}: Age \${s.age}, \${s.gender}, \${s.status}, \${s.sexualOrientation}\`);
      console.log(\`       Dates: \${s.startDate?.toISOString().split('T')[0]} to \${s.endDate?.toISOString().split('T')[0]}\`);
    });
    
    console.log(\`\\n✅ Database check complete!\`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.\$disconnect();
  }
}

checkData();
"
