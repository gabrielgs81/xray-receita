import { expect, test } from '@playwright/test'

const slug = 'a'.repeat(64)

test('entrega o mercado regional de forma direta no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/rest/v1/rpc/xray_revenue_track_view', route => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
  await page.route('**/rest/v1/rpc/xray_revenue_get_report', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      report: {
        answers: { gymName: 'Academia Movimento', neighborhood: 'Centro', city: 'São José do Rio Preto', totalRevenue: 45000, revenueGoal: 60000 },
        metrics: { annualOpportunity: 184320, projectedRevenue: 60360, score: 73, monthlyPriceOpportunity: 8500, monthlyRetentionOpportunity: 3200, monthlyDefaultOpportunity: 1100, realizedTicket: 130, recommendedTicket: 159, churnTolerance: 18 },
      },
      research_status: 'completed',
      market_research: {
        market: { gyms_identified: 3, wellhub_confirmed: 2, without_wellhub_presence: 1, public_prices_found: 2, average_monthly_price: 129.95, median_monthly_price: 129.95, minimum_monthly_price: 109.9, maximum_monthly_price: 149.99 },
        competitors: [
          { name: 'BlueFit Andaló', address: 'Av. Alberto Andaló, 3444', distance_km: 0.4, category: 'Academia de rede', public_monthly_price: 149.99, plans_found: ['Silver'], wellhub_status: 'presente', source_urls: ['https://wellhub.com/'] },
          { name: 'Academia Local', address: null, distance_km: 1.8, category: null, public_monthly_price: null, plans_found: [], wellhub_status: 'sem_presenca_identificada', source_urls: ['https://example.com/'] },
        ],
      },
    }),
  }))

  await page.goto(`/r/${slug}`)
  await expect(page.getByRole('heading', { name: 'Centro, São José do Rio Preto' })).toBeVisible()
  await expect(page.getByText('Presentes no Wellhub')).toBeVisible()
  await expect(page.getByText('Sem presença identificada no Wellhub')).toBeVisible()
  await expect(page.getByText(/não encontrado|inconclusiv|o que a ia fez/i)).toHaveCount(0)
  await page.screenshot({ path: 'test-results/report-market-mobile.png', fullPage: true })
})
