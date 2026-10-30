import { getConfig } from '../config/env';
import { connectMongo, disconnectMongo } from '../infrastructure/database/mongoose';
import { AnalysisService } from '../modules/analysis/services/analysis.service';

async function main(): Promise<void> {
  const config = getConfig();
  await connectMongo();

  const analysisService = new AnalysisService();
  const result = await analysisService.analyze({
    documentPathId: 'sample',
    pageStart: 6,
    pageEnd: 8,
    dpi: config.ANALYSIS_DEFAULT_DPI,
    generatePreviews: true,
  });

  console.log('Sample pages analyzed successfully:');
  console.log(JSON.stringify(result, null, 2));

  await disconnectMongo();
}

void main();
