'use client'
import { useState, useEffect } from 'react'

type Obra = { codigo: string; nome: string; cliente: string }
type ListaAux = { tipo: string; valor: string }
type Funcionario = { nome: string }
type TabType = 'recebimentos' | 'despesas' | 'transferencias' | 'apontamentos'

const FORMAS_PAGAMENTO_FALLBACK = [
  'Pix', 'TED', 'Dinheiro', 'Cartão crédito', 'Cartão débito',
  'Boleto', 'Depósito', 'Cheque', 'Conta',
]

const CATEGORIAS_FALLBACK = [
  'Aço', 'Telha', 'Painel', 'Tinta', 'M.O. diária', 'M.O. salário',
  'Rufo', 'Calha', 'Insumos', 'Alimentação', 'Transporte', 'Manutenção',
  'Seguro', 'Taxa', 'Outros', 'Comissão', 'Chumbador', 'EPIs',
  'Calha e Rufo', 'Parafusos, barras e afins', 'Vedações',
]

const CAIXAS_ORIGEM = ['SJC Edif.', 'Sercal']

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'recebimentos', label: 'Recebimentos', icon: '💰' },
  { id: 'despesas', label: 'Despesas', icon: '💸' },
  { id: 'transferencias', label: 'Transferências', icon: '🔄' },
  { id: 'apontamentos', label: 'Apontamentos', icon: '📝' },
]

export default function LancamentoPage() {
  const [tabAtiva, setTabAtiva] = useState<TabType>('recebimentos')
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<string[]>([])
  const [veiculos, setVeiculos] = useState<string[]>([])
  const [carregandoObras, setCarregandoObras] = useState(true)
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK)
  const [formasPagamento, setFormasPagamento] = useState<string[]>(FORMAS_PAGAMENTO_FALLBACK)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const [rec, setRec] = useState({ data: new Date().toISOString().split('T')[0], obra: '', valor: '', parcela: '1', formaPagamento: 'Pix' })
  const [desp, setDesp] = useState({ data: new Date().toISOString().split('T')[0], obra: '', fornecedor: '', categoria: '', subcategoria: '', descricao: '', valor: '', caixaOrigem: 'SJC Edif.', formaPagamento: '' })
  const [transf, setTransf] = useState({ data: new Date().toISOString().split('T')[0], caixaOrigem: 'SJC Edificações', caixaDestino: 'Sercal Engenharia', valor: '', motivo: '', descricao: '' })
  const [apon, setApon] = useState({ data: new Date().toISOString().split('T')[0], funcionario: '', tipo: 'Diária', obra: '', almoco: 'Não', veiculo: '', obs: '' })

  // Carregar obras, listas auxiliares, funcionários e veículos
  useEffect(() => {
    async function carregar() {
      try {
        const [resObras, resListas, resFunc, resVeic] = await Promise.all([
          fetch('/api/sheets/read?resource=obras'),
          fetch('/api/sheets/read?resource=listas'),
          fetch('/api/sheets/read?resource=funcionarios'),
          fetch('/api/sheets/read?resource=veiculos'),
        ])

        if (resObras.ok) {
          const json = await resObras.json()
          setObras(json?.data || [])
        }

        if (resListas.ok) {
          const json = await resListas.json()
          const lista: ListaAux[] = json?.data || []
          if (lista.length > 0) {
            const cats = lista.filter(l => l.tipo === 'Categoria').map(l => l.valor).filter(Boolean)
            const fps = lista.filter(l => l.tipo === 'Forma Pagamento' || l.tipo === 'Forma de Pagamento').map(l => l.valor).filter(Boolean)
            if (cats.length > 0) setCategorias(cats)
            if (fps.length > 0) setFormasPagamento(fps)
          }
        }

        if (resFunc.ok) {
          const json = await resFunc.json()
          const lista: Funcionario[] = json?.data || []
          setFuncionarios(lista.map(f => f.nome).filter(Boolean))
        }

        if (resVeic.ok) {
          const json = await resVeic.json()
          const lista: string[] = json?.data || []
          setVeiculos(lista)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setCarregandoObras(false)
      }
    }
    carregar()
  }, [])

  async function send(action: string, data: any) {
    setSalvando(true)
    setMensagem(null)
    try {
      const res = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      })
      const result = await res.json()
      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: `✅ ${action === 'recebimento' ? 'Recebimento' : action === 'despesa' ? 'Despesa' : action === 'transferencia' ? 'Transferência' : 'Apontamento'} registrado com sucesso!` })
        return true
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao registrar.' })
        return false
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão com o servidor.' })
      return false
    } finally {
      setSalvando(false)
    }
  }

  function limparMensagem() { setMensagem(null) }

  async function handleRecebimento(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(rec.valor.replace(',', '.'))
    if (!rec.obra || !valorNum) return setMensagem({ tipo: 'erro', texto: 'Selecione a obra e informe o valor.' })
    const obraSel = obras.find(o => o.codigo === rec.obra)
    const ok = await send('recebimento', {
      obra: obraSel?.nome || rec.obra, valor: valorNum, parcela: rec.parcela, formaPagamento: rec.formaPagamento,
    })
    if (ok) setRec({ data: new Date().toISOString().split('T')[0], obra: '', valor: '', parcela: '1', formaPagamento: 'Pix' })
  }

  async function handleDespesa(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(desp.valor.replace(',', '.'))
    if (!desp.obra || !valorNum) return setMensagem({ tipo: 'erro', texto: 'Preencha obra e valor.' })
    if (!desp.categoria) return setMensagem({ tipo: 'erro', texto: 'Selecione uma categoria.' })
    if (!desp.formaPagamento) return setMensagem({ tipo: 'erro', texto: 'Selecione a forma de pagamento.' })
    const obraSel = obras.find(o => o.codigo === desp.obra)
    const ok = await send('despesa', {
      obra: obraSel?.nome || desp.obra, fornecedor: desp.fornecedor, categoria: desp.categoria,
      subcategoria: desp.subcategoria, descricao: desp.descricao, valor: valorNum,
      caixaOrigem: desp.caixaOrigem, formaPagamento: desp.formaPagamento,
    })
    if (ok) setDesp({ data: new Date().toISOString().split('T')[0], obra: '', fornecedor: '', categoria: '', subcategoria: '', descricao: '', valor: '', caixaOrigem: 'SJC Edif.', formaPagamento: '' })
  }

  async function handleTransferencia(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(transf.valor.replace(',', '.'))
    if (!transf.caixaOrigem || !transf.caixaDestino || !valorNum) return setMensagem({ tipo: 'erro', texto: 'Preencha origem, destino e valor.' })
    if (transf.caixaOrigem === transf.caixaDestino) return setMensagem({ tipo: 'erro', texto: 'Origem e destino devem ser diferentes.' })
    const ok = await send('transferencia', {
      caixaOrigem: transf.caixaOrigem, caixaDestino: transf.caixaDestino,
      valor: valorNum, subcategoria: transf.motivo,
      descricao: transf.descricao || `Transferência de ${transf.caixaOrigem} para ${transf.caixaDestino}`,
    })
    if (ok) setTransf({ data: new Date().toISOString().split('T')[0], caixaOrigem: 'SJC Edificações', caixaDestino: 'Sercal Engenharia', valor: '', motivo: '', descricao: '' })
  }

  async function handleApontamento(e: React.FormEvent) {
    e.preventDefault()
    if (!apon.funcionario) return setMensagem({ tipo: 'erro', texto: 'Selecione o funcionário.' })
    const obraSel = obras.find(o => o.codigo === apon.obra)
    const ok = await send('apontamento', {
      funcionario: apon.funcionario,
      tipo: apon.tipo,
      obra: obraSel?.nome || apon.obra,
      almoco: apon.almoco,
      veiculo: apon.veiculo,
      obs: apon.obs,
    })
    if (ok) setApon({ data: new Date().toISOString().split('T')[0], funcionario: '', tipo: 'Diária', obra: '', almoco: 'Não', veiculo: '', obs: '' })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-sercal-navy mb-6">Lançamentos</h1>

      {mensagem && (
        <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${mensagem.tipo === 'sucesso' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          <span>{mensagem.texto}</span>
          <button onClick={limparMensagem} className="text-sm font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setTabAtiva(tab.id); limparMensagem() }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${tabAtiva === tab.id ? 'bg-white text-sercal-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span className="mr-1.5">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ RECEBIMENTOS ═══════════ */}
      {tabAtiva === 'recebimentos' && (
        <form onSubmit={handleRecebimento} className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h2 className="text-lg font-semibold text-sercal-navy border-b pb-3">💰 Novo Recebimento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📅 Data</label>
              <input type="date" value={rec.data} onChange={e => setRec({...rec, data: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🔢 Parcela</label>
              <input type="number" min="1" value={rec.parcela} onChange={e => setRec({...rec, parcela: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">🏗️ Obra</label>
            <select value={rec.obra} onChange={e => setRec({...rec, obra: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
              <option value="">Selecione...</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}{o.cliente ? ` (${o.cliente})` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor (R$)</label>
              <input type="text" value={rec.valor} onChange={e => setRec({...rec, valor: e.target.value})} placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">💳 Forma de Pagamento</label>
              <select value={rec.formaPagamento} onChange={e => setRec({...rec, formaPagamento: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                {formasPagamento.map(fp => <option key={fp} value={fp}>{fp}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={salvando || obras.length === 0}
            className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {salvando ? 'Registrando...' : '💰 Registrar Recebimento'}
          </button>
        </form>
      )}

      {/* ═══════════ DESPESAS ═══════════ */}
      {tabAtiva === 'despesas' && (
        <form onSubmit={handleDespesa} className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h2 className="text-lg font-semibold text-sercal-navy border-b pb-3">💸 Nova Despesa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📅 Data</label>
              <input type="date" value={desp.data} onChange={e => setDesp({...desp, data: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🏢 Fornecedor</label>
              <input type="text" value={desp.fornecedor} onChange={e => setDesp({...desp, fornecedor: e.target.value})} placeholder="Nome do fornecedor"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">🏗️ Obra</label>
            <select value={desp.obra} onChange={e => setDesp({...desp, obra: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
              <option value="">Selecione...</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">📂 Categoria</label>
            <select value={desp.categoria} onChange={e => setDesp({...desp, categoria: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
              <option value="">Selecione...</option>
              {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🔤 Subcategoria <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="text" value={desp.subcategoria} onChange={e => setDesp({...desp, subcategoria: e.target.value})} placeholder="Ex: Parafusos, Telha"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor (R$)</label>
              <input type="text" value={desp.valor} onChange={e => setDesp({...desp, valor: e.target.value})} placeholder="0,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Descrição</label>
            <input type="text" value={desp.descricao} onChange={e => setDesp({...desp, descricao: e.target.value})} placeholder="Ex: Compra de material"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📤 Caixa de Origem</label>
              <select value={desp.caixaOrigem} onChange={e => setDesp({...desp, caixaOrigem: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                {CAIXAS_ORIGEM.map(cx => <option key={cx} value={cx}>{cx}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">💳 Forma de Pagamento</label>
              <select value={desp.formaPagamento} onChange={e => setDesp({...desp, formaPagamento: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                <option value="">Selecione...</option>
                {formasPagamento.map(fp => <option key={fp} value={fp}>{fp}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={salvando}
            className="w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition disabled:opacity-50">
            {salvando ? 'Registrando...' : '💸 Registrar Despesa'}
          </button>
        </form>
      )}

      {/* ═══════════ TRANSFERÊNCIAS ═══════════ */}
      {tabAtiva === 'transferencias' && (
        <form onSubmit={handleTransferencia} className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h2 className="text-lg font-semibold text-sercal-navy border-b pb-3">🔄 Nova Transferência</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📅 Data</label>
              <input type="date" value={transf.data} onChange={e => setTransf({...transf, data: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">💰 Valor (R$)</label>
              <input type="text" value={transf.valor} onChange={e => setTransf({...transf, valor: e.target.value})} placeholder="0,00"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📤 De (Origem)</label>
              <select value={transf.caixaOrigem} onChange={e => setTransf({...transf, caixaOrigem: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                {['SJC Edificações', 'Sercal Engenharia', 'Ratinho', 'Mibi', 'Investimentos', 'Comissões Pagas', 'Vales'].map(cx => (
                  <option key={cx} value={cx} disabled={cx === transf.caixaDestino}>{cx}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📥 Para (Destino)</label>
              <select value={transf.caixaDestino} onChange={e => setTransf({...transf, caixaDestino: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                {['SJC Edificações', 'Sercal Engenharia', 'Ratinho', 'Mibi', 'Investimentos', 'Comissões Pagas', 'Vales'].map(cx => (
                  <option key={cx} value={cx} disabled={cx === transf.caixaOrigem}>{cx}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">📋 Motivo <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={transf.motivo} onChange={e => setTransf({...transf, motivo: e.target.value})} placeholder="Ex: Zerar caixa Sercal"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">📝 Descrição <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={transf.descricao} onChange={e => setTransf({...transf, descricao: e.target.value})} placeholder="Ex: Reposição de caixa"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
          </div>
          <button type="submit" disabled={salvando}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {salvando ? 'Registrando...' : '🔄 Registrar Transferência'}
          </button>
        </form>
      )}

      {/* ═══════════ APONTAMENTOS ═══════════ */}
      {tabAtiva === 'apontamentos' && (
        <form onSubmit={handleApontamento} className="bg-white rounded-xl shadow-md p-6 space-y-5">
          <h2 className="text-lg font-semibold text-sercal-navy border-b pb-3">📝 Novo Apontamento</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📅 Data</label>
              <input type="date" value={apon.data} onChange={e => setApon({...apon, data: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">📂 Tipo</label>
              <select value={apon.tipo} onChange={e => setApon({...apon, tipo: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                <option value="Diária">Diária</option>
                <option value="Registro">Registro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">👤 Funcionário</label>
            {funcionarios.length === 0 ? (
              <div className="w-full border border-gray-300 rounded-lg px-3 py-4 bg-gray-50 text-center text-sm text-amber-600">
                ⏳ Carregando funcionários...
              </div>
            ) : (
              <select value={apon.funcionario} onChange={e => setApon({...apon, funcionario: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                <option value="">Selecione o funcionário...</option>
                {funcionarios.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">🏗️ Obra <span className="text-gray-400 font-normal">(opcional)</span></label>
            <select value={apon.obra} onChange={e => setApon({...apon, obra: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
              <option value="">Nenhuma</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🍽️ Almoço</label>
              <select value={apon.almoco} onChange={e => setApon({...apon, almoco: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">🚗 Veículo <span className="text-gray-400 font-normal">(opcional)</span></label>
              <select value={apon.veiculo} onChange={e => setApon({...apon, veiculo: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy">
                <option value="">Nenhum</option>
                {veiculos.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">💬 Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={apon.obs} onChange={e => setApon({...apon, obs: e.target.value})} placeholder="Observações"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sercal-navy/20 focus:border-sercal-navy" />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>⚡ Automático:</strong> A planilha gera o ID (coluna B) e calcula a coluna H automaticamente.
          </div>

          <button type="submit" disabled={salvando}
            className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
            {salvando ? 'Registrando...' : '📝 Registrar Apontamento'}
          </button>
        </form>
      )}
    </div>
  )
}