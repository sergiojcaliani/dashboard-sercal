'use client'

import { useEffect, useState } from 'react'

type Caixa = { nome: string; saldo: number; tipo: string }
type Lancamento = {
  data: string; descricao: string; debito: number; credito: number
  caixa: string; tipo: string; obra: string
}

function toBRL(val: number) {
  return `R$ ${val.toFixed(2).replace('.', ',')}`
}

export default function Dashboard() {
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [resCaixas, resLanc] = await Promise.all([
          fetch('/api/sheets/read?resource=caixas'),
          fetch('/api/sheets/read?resource=lancamentos'),
        ])
        const dadosCaixas = await resCaixas.json()
        const dadosLanc = await resLanc.json()
        if (dadosCaixas.data) setCaixas(dadosCaixas.data)
        if (dadosLanc.data) setLancamentos(dadosLanc.data)
      } catch (e) {
        console.error('Erro ao carregar:', e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const totalCaixas = caixas.reduce((acc, c) => acc + c.saldo, 0)

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 📊 Cards de Saldo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {caixas.map((caixa) => (
          <div
            key={caixa.nome}
            className={`rounded-xl p-4 shadow-md text-white ${
              caixa.saldo >= 0 ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            <p className="text-sm opacity-80">{caixa.nome}</p>
            <p className="text-xl font-bold mt-1">{toBRL(caixa.saldo)}</p>
          </div>
        ))}

        {/* Card Total Geral */}
        <div className="rounded-xl p-4 shadow-md bg-sercal-navy text-white">
          <p className="text-sm opacity-80">Total Geral</p>
          <p className="text-xl font-bold mt-1">{toBRL(totalCaixas)}</p>
        </div>
      </div>

      {/* 📋 Últimos Lançamentos */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h2 className="text-lg font-bold text-sercal-navy mb-4">Últimos Lançamentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Data</th>
                <th className="pb-2">Descrição</th>
                <th className="pb-2 text-right">Débito</th>
                <th className="pb-2 text-right">Crédito</th>
                <th className="pb-2">Caixa</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2">{l.data}</td>
                  <td className="py-2 max-w-xs truncate">{l.descricao}</td>
                  <td className="py-2 text-right text-red-600">
                    {l.debito > 0 ? toBRL(l.debito) : '-'}
                  </td>
                  <td className="py-2 text-right text-green-600">
                    {l.credito > 0 ? toBRL(l.credito) : '-'}
                  </td>
                  <td className="py-2">{l.caixa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}