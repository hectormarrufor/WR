// POST /api/cost-estimates
import { CostEstimate } from '@/models';

export async function POST(req) {
  const body = await req.json();

  const estimate = await CostEstimate.create({
    name: body.name,
    chutoKm: body.chutoKm,
    lowboyKm: body.lowboyKm,
    vacuumHr: body.vacuumHr,
    montacargaHr: body.montacargaHr,
    resguardoHr: body.resguardoHr,
    totalCost: body.totalCost,
    breakdown: body.breakdown
  });

  return Response.json(estimate);
}