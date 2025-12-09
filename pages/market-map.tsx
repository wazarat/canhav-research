import { GetStaticProps } from 'next'
import Layout from '../components/Layout'
import MarketMap from '../components/MarketMap'
import { generateStaticMarketMapData, GroupedMarketMap } from '../lib/ethereumMap'

interface MarketMapPageProps {
  groupedData: GroupedMarketMap
  sectors: string[]
}

export default function MarketMapPage({ groupedData, sectors }: MarketMapPageProps) {
  return (
    <Layout>
      <MarketMap groupedData={groupedData} sectors={sectors} />
    </Layout>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const { grouped, sectors } = generateStaticMarketMapData()
  
  return {
    props: {
      groupedData: grouped,
      sectors: sectors,
    },
    revalidate: 3600, // Revalidate every hour
  }
}
