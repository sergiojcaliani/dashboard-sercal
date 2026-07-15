'use client'
import { useState, useEffect } from 'react'

type Caixa = { nome: string; saldo: number }
type ResumoMes = { receitas: number; despesas: number; saldo: number }
type Lancamento = { data: string; tipo: string; obra: string; clienteFornecedor: string; valor: string; caixa: string; formaPagamento: string }
type ObraResumo = { obra: string; receitas: number; despesas: number; saldo: number }
type Apontamento = { data: string; funcionario: string; tipo: string; obra: string; almoco: string; veiculo: string; km: string; obs: string }
type Obra = { codigo: string; nome: string; cliente: string; distancia: number; lucroPercent: number }

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function DashboardPage() {
  const agora = new Date()
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [resumoMes, setResumoMes] = useState<ResumoMes | null>(null)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [resumoObra, setResumoObra] = useState<ObraResumo[]>([])
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarObras, setMostrarObras] = useState(false)
  const [mostrarApontamentos, setMostrarApontamentos] = useState(false)
  const [tipoApontamento, setTipoApontamento] = useState<'dia' | 'mes' | 'data'>('dia')
  const [dataApontamento, setDataApontamento] = useState('')
  const [mesSelecionado, setMesSelecionado] = useState(agora.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(agora.getFullYear())

  function getLucroPercent(obraNome: string): number {
    if (!obraNome) return 0
    const obra = obras.find(o => o.nome === obraNome)
    return obra?.lucroPercent ?? 0
  }

  async function carregarResumoMes(mes: number, ano: number) {
    try {
      const res = await fetch(`/api/dashboard?resource=resumo-mes&mes=${mes}&ano=${ano}`)
      if (res.ok) { const json = await res.json(); setResumoMes(json?.data || null) }
    } catch (err) { console.error('Erro ao carregar resumo do mês:', err) }
  }

  useEffect(() => {
    async function carregar() {
      setCarregando(true)
      try {
        const [resCaixas, resLanc, resObras] = await Promise.all([
          fetch('/api/dashboard?resource=saldo-caixas'),
          fetch('/api/dashboard?resource=ultimos-lancamentos&dias=7'),
          fetch('/api/sheets/read?resource=obras'),
        ])
        if (resCaixas.ok) { const json = await resCaixas.json(); setCaixas(json?.data || []) }
        if (resLanc.ok) { const json = await resLanc.json(); setLancamentos(json?.data || []) }
        if (resObras.ok) { const json = await resObras.json(); setObras(json?.data || []) }
      } catch (err) { console.error('Erro ao carregar dashboard:', err) }
      finally { setCarregando(false) }
    }
    carregar()
    carregarResumoMes(agora.getMonth() + 1, agora.getFullYear())
  }, [])

  useEffect(() => { carregarResumoMes(mesSelecionado, anoSelecionado) }, [mesSelecionado, anoSelecionado])

  async function carregarObras() {
    try {
      const res = await fetch('/api/dashboard?resource=resumo-obra')
      if (res.ok) { const json = await res.json(); setResumoObra(json?.data || []) }
    } catch (err) { console.error('Erro ao carregar resumo por obra:', err) }
  }

  async function carregarApontamentos(tipo: 'dia' | 'mes' | 'data', data?: string) {
    try {
      let url = `/api/dashboard?resource=apontamentos&tipo=${tipo}`
      if (data) url += `&data=${data}`
      const res = await fetch(url)
      if (res.ok) { const json = await res.json(); setApontamentos(json?.data || []) }
    } catch (err) { console.error('Erro ao carregar apontamentos:', err) }
  }

  function formatValor(v: number | string | null | undefined): string {
    if (v === null || v === undefined) return '0,00'
    const num = typeof v === 'string' ? parseFloat(v) || 0 : v
    if (isNaN(num)) return '0,00'
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const totalGeral = caixas.reduce((acc, c) => acc + (c.saldo || 0), 0)

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-xl sm:text-2xl font-bold text-sercal-navy mb-6">📊 Dashboard</h1>
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg">⏳ Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4">
      <h1 className="text-xl sm:text-2xl font-bold text-sercal-navy mb-4 sm:mb-6">📊 Dashboard</h1>

      {/* ═══════ Caixas ═══════ */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">💰 Saldo dos Caixas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {caixas.map(caixa => {
            const cor = caixa.saldo >= 0 ? 'text-green-600' : 'text-red-600'
            const bg = caixa.saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            return (
              <div key={caixa.nome} className={`${bg} border rounded-xl p-3 sm:p-4`}>
                <p className="text-xs sm:text-sm font-semibold text-gray-600 truncate">{caixa.nome}</p>
                <p className={`text-base sm:text-xl font-bold ${cor} truncate`}>
                  {caixa.saldo >= 0 ? '' : '- '}R$ {formatValor(Math.abs(caixa.saldo))}
                </p>
              </div>
            )
          })}
          <div className="bg-sercal-navy/5 border border-sercal-navy/20 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-600">Total Geral</p>
            <p className={`text-base sm:text-xl font-bold truncate ${totalGeral >= 0 ? 'text-sercal-navy' : 'text-red-600'}`}>
              R$ {formatValor(totalGeral)}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ Resumo do Mês ═══════ */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-700">📈 Saldo do Mês</h2>
          <div className="flex items-center gap-2">
            <select value={mesSelecionado} onChange={e => setMesSelecionado(parseInt(e.target.value))}
              className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {MESES.map((nome, i) => <option key={i + 1} value={i + 1}>{nome}</option>)}
            </select>
            <select value={anoSelecionado} onChange={e => setAnoSelecionado(parseInt(e.target.value))}
              className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {resumoMes ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-600">✅ Receitas</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">R$ {formatValor(resumoMes.receitas)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-600">❌ Despesas</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">R$ {formatValor(resumoMes.despesas)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-600">📊 Saldo</p>
              <p className={`text-lg sm:text-xl font-bold ${resumoMes.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                R$ {formatValor(resumoMes.saldo)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-400">Nenhum lançamento neste mês.</div>
        )}
      </div>

      {/* ═══════ Botões ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <button onClick={() => { setMostrarObras(!mostrarObras); if (!mostrarObras) carregarObras() }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl hover:bg-indigo-700 transition shadow-md text-sm sm:text-base">
          <span className="text-lg sm:text-xl">📊</span>
          {mostrarObras ? 'Fechar Resumo por Obra' : 'Resumo por Obra'}
        </button>
        <button onClick={() => { setMostrarApontamentos(!mostrarApontamentos); if (!mostrarApontamentos) { setTipoApontamento('dia'); carregarApontamentos('dia') } }}
          className="flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl hover:bg-purple-700 transition shadow-md text-sm sm:text-base">
          <span className="text-lg sm:text-xl">📝</span>
          {mostrarApontamentos ? 'Fechar Apontamentos' : 'Apontamentos do Dia/Mês'}
        </button>
      </div>

      {/* ═══════ Resumo por Obra (toggle) — COM LUCRO % ═══════ */}
      {mostrarObras && (
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">📊 Resumo por Obra</h2>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {resumoObra.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Nenhuma obra encontrada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold">Obra</th>
                      <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Receitas</th>
                      <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Despesas</th>
                      <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Saldo</th>
                      <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">🎯 Lucro %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoObra.map((o, i) => {
                      const lucro = getLucroPercent(o.obra)
                      return (
                        <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-medium max-w-[120px] truncate">{o.obra}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right text-green-600 whitespace-nowrap">R$ {formatValor(o.receitas)}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-right text-red-600 whitespace-nowrap">R$ {formatValor(o.despesas)}</td>
                          <td className={`px-2 sm:px-4 py-2.5 sm:py-3 text-right font-bold whitespace-nowrap ${o.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {formatValor(o.saldo)}
                          </td>
                          <td className={`px-2 sm:px-4 py-2.5 sm:py-3 text-right font-semibold whitespace-nowrap ${lucro > 0 ? 'text-green-600' : lucro < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {lucro !== 0 ? `${lucro > 0 ? '+' : ''}${lucro}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Apontamentos (toggle) — SEM LUCRO % ═══════ */}
      {mostrarApontamentos && (
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-700">📝 Apontamentos</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setTipoApontamento('dia'); setDataApontamento(''); carregarApontamentos('dia') }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${tipoApontamento === 'dia' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Hoje</button>
              <button onClick={() => { setTipoApontamento('mes'); setDataApontamento(''); carregarApontamentos('mes') }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${tipoApontamento === 'mes' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mês</button>
              <input type="date" value={dataApontamento} onChange={e => { const val = e.target.value; if (val) { const [ano, mes, dia] = val.split('-'); setDataApontamento(val); setTipoApontamento('data'); carregarApontamentos('data', `${dia}/${mes}/${ano}`) } }}
                className="px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 max-w-[140px] sm:max-w-none" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {apontamentos.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Nenhum apontamento encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Data</th>
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold">Func.</th>
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold">Tipo</th>
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden sm:table-cell">Obra</th>
                      <th className="text-center px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden md:table-cell">Almoço</th>
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden md:table-cell">Veículo</th>
                      <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden lg:table-cell">Obs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apontamentos.map((a, i) => (
                      <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">{a.data}</td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 font-medium max-w-[80px] truncate">{a.funcionario}</td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${a.tipo === 'Diária' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{a.tipo}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden sm:table-cell max-w-[100px] truncate">{a.obra || '—'}</td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center hidden md:table-cell">
                          <span className={a.almoco === 'Sim' ? 'text-green-600' : 'text-gray-400'}>{a.almoco || '—'}</span>
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden md:table-cell">{a.veiculo || '—'}</td>
                        <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-gray-500 hidden lg:table-cell max-w-[120px] truncate">{a.obs || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Últimos Lançamentos (7 dias) ═══════ */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">🔄 Últimos Lançamentos (7 dias)</h2>
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {lancamentos.length === 0 ? (
            <div className="p-6 text-center text-gray-400">Nenhum lançamento nos últimos 7 dias.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Data</th>
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold">Tipo</th>
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold">Obra</th>
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden md:table-cell">Cliente/Fornec.</th>
                    <th className="text-right px-2 sm:px-4 py-2 sm:py-3 font-semibold whitespace-nowrap">Valor</th>
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden lg:table-cell">Caixa</th>
                    <th className="text-left px-2 sm:px-4 py-2 sm:py-3 font-semibold hidden lg:table-cell">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l, i) => (
                    <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">{l.data}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${(l.tipo || '').toLowerCase() === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {l.tipo || (parseFloat(String(l.valor)) > 0 ? 'Recebimento' : 'Despesa')}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 max-w-[80px] sm:max-w-none truncate">{l.obra}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden md:table-cell max-w-[100px] truncate">{l.clienteFornecedor}</td>
                      <td className={`px-2 sm:px-4 py-2.5 sm:py-3 text-right font-medium whitespace-nowrap ${(l.tipo || '').toLowerCase() === 'receita' || (!l.tipo && parseFloat(String(l.valor)) > 0) ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {formatValor(l.valor)}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">{l.caixa}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 hidden lg:table-cell">{l.formaPagamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}