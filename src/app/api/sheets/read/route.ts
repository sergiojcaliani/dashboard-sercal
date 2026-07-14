import { NextResponse } from 'next/server'
import { getCaixas, getUltimosLancamentos, getObras, getFuncionarios } from '@/lib/sheets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource')

  try {
    let data
    switch (resource) {
      case 'caixas':
        data = await getCaixas()
        break
      case 'lancamentos':
        data = await getUltimosLancamentos()
        break
      case 'obras':
        data = await getObras()
        break
      case 'funcionarios':
        data = await getFuncionarios()
        break
      default:
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro ao ler:', error)
    return NextResponse.json({ error: 'Erro ao ler dados' }, { status: 500 })
  }
}