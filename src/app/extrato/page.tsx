'use client'

import { useEffect, useState } from 'react'

type Lancamento = {
  data: string; descricao: string; debito: number; credito: number
  caixa: string; tipo: string; obra: string
}
type Caixa = { nome: string; saldo: number; tipo: string }

function toBRL(val: number) {
  return `R$ ${val.toFixed(2).replace('.', ',')}`
}

export default function Extrato() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [filtroCaixa, setFiltroCaixa] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [resL, resC] = await Promise.all([
          fetch('/api/sheets/read?resource=lancamentos'),
          fetch('/api/sheets/read?resource=caixas'),
        ])
        const dL = await resL.json()
        const dC = await resC.json()
        if (dL.data) setLancamentos(dL.data)
        if (dC.data) setCaixas(dC.data)
      } catch (e) {
        console.error(e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const filtrados = lancamentos.filter(l => {
    if (filtroCaixa !== 'todos' && l.caixa !== filtroCaixa) return false
    if (filtroTipo === 'debito' && l.debito <= 0) return false
    if (filtroTipo === 'credito' && l.credito <= 0) return false
    if (busca && !l.descricao.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const totalDebitos = filtrados.reduce((a, l) => a + l.debito, 0)
  const totalCreditos = filtrados.reduce((a, l) => a + l.credito, 0)

  if (carregando) {
    return <div className="flex justify-center py-20 text-gray-500">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sercal-navy">Extrato de Lançamentos</h1>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Caixa</label>
          <select
            className="border rounded-lg p-2 w-full"
            value={filtroCaixa}
            onChange={e => setFiltroCaixa(e.target.value)}
          >
            <option value="todos">Todos os caixas</option>
            {caixas.map(c => (
              <option key={c.nome} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-gray-500 block mb-1">Tipo</label>
          <select
            className="border rounded-lg p-2 w-full"
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="debito">Débitos</option>
            <option value="credito">Créditos</option>
          </select>
        </div>
        <div className="flex-[2] min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Buscar</label>
          <input
            className="border rounded-lg p-2 w-full"
            placeholder="Descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Lançamentos</p>
          <p className="text-xl font-bold">{filtrados.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Débitos</p>
          <p className="text-xl font-bold text-red-600">{toBRL(totalDebitos)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <p className="text-sm text-gray-500">Total Créditos</p>
          <p className="text-xl font-bold text-green-600">{toBRL(totalCreditos)}</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Data</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Obra</th>
                <th className="p-3 text-right">Débito</th>
                <th className="p-3 text-right">Crédito</th>
                <th className="p-3">Caixa</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap">{l.data}</td>
                  <td className="p-3 max-w-xs truncate">{l.descricao}</td>
                  <td className="p-3">{l.obra}</td>
                  <td className="p-3 text-right text-red-600">
                    {l.debito > 0 ? toBRL(l.debito) : '-'}
                  </td>
                  <td className="p-3 text-right text-green-600">
                    {l.credito > 0 ? toBRL(l.credito) : '-'}
                  </td>
                  <td className="p-3">{l.caixa}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}