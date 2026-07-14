import { NextResponse } from 'next/server'
import { addDespesa, addRecebimento, addTransferencia, addApontamento } from '@/lib/sheets'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    let result
    switch (action) {
      case 'despesa':
        result = await addDespesa(data)
        break
      case 'recebimento':
        result = await addRecebimento(data)
        break
      case 'transferencia':
        result = await addTransferencia(data)
        break
      case 'apontamento':
        result = await addApontamento(data)
        break
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: result })
  } catch (error) {
    console.error('Erro ao escrever:', error)
    return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 })
  }
}