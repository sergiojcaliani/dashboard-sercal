import { NextResponse } from 'next/server'
import { getSaldoCaixas, getResumoMes, getUltimosLancamentosDashboard, getResumoObra, getApontamentos } from '@/lib/sheets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource') || 'saldo-caixas'

  try {
    let data

    switch (resource) {
      case 'saldo-caixas':
        data = await getSaldoCaixas()
        break
      case 'resumo-mes': {
        const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : undefined
        const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : undefined
        data = await getResumoMes(mes, ano)
        break
      }
      case 'ultimos-lancamentos': {
        const dias = searchParams.get('dias') ? parseInt(searchParams.get('dias')!) : 7
        data = await getUltimosLancamentosDashboard(dias)
        break
      }
      case 'resumo-obra':
        data = await getResumoObra()
        break
      case 'apontamentos': {
        const tipo = (searchParams.get('tipo') as 'dia' | 'mes' | 'data') || 'dia'
        const dataParam = searchParams.get('data') || undefined
        data = await getApontamentos(tipo, dataParam)
        break
      }
      default:
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro no dashboard:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard' }, { status: 500 })
  }
}