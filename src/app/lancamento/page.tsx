'use client'

import { useEffect, useState } from 'react'

type Caixa = { nome: string; saldo: number; tipo: string }
type Obra = { codigo: string; nome: string; cliente: string }
type Funcionario = { codigo: string; apelido: string; nome: string; funcao: string }

function toBRL(val: number) {
  return `R$ ${val.toFixed(2).replace('.', ',')}`
}

export default function Lancamento() {
  const [abas, setAbas] = useState('despesa')
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [status, setStatus] = useState('')
  const [carregando, setCarregando] = useState(true)

  // Estados do formulário de despesa
  const [desp, setDesp] = useState({ obra: '', fornecedor: '', categoria: '', subcategoria: '', descricao: '', valor: '', caixaOrigem: '', formaPagamento: 'Pix' })

  // Estados do recebimento
  const [rec, setRec] = useState({ obra: '', valor: '', parcela: 'Única', notaEmitidaPor: '', comissaoRatinho: '', comissaoMibi: '', imposto: '', caixaDestino: '', formaPagamento: 'Pix' })

  // Estados da transferência
  const [transf, setTransf] = useState({ caixaOrigem: '', caixaDestino: '', valor: '', subcategoria: 'Transferência', descricao: '' })

  // Estados do apontamento
  const [apo, setApo] = useState({ funcionario: '', tipo: 'Presencial', obra: '', almoco: false, veiculo: '', kmRodado: '', obs: '' })

  useEffect(() => {
    async function carregar() {
      try {
        const [resC, resO, resF] = await Promise.all([
          fetch('/api/sheets/read?resource=caixas'),
          fetch('/api/sheets/read?resource=obras'),
          fetch('/api/sheets/read?resource=funcionarios'),
        ])
        const dC = await resC.json()
        const dO = await resO.json()
        const dF = await resF.json()
        if (dC.data) setCaixas(dC.data)
        if (dO.data) setObras(dO.data)
        if (dF.data) setFuncionarios(dF.data)
      } catch (e) {
        console.error(e)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  async function enviar(action: string, data: any) {
    setStatus('Salvando...')
    try {
      const res = await fetch('/api/sheets/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      })
      const result = await res.json()
      if (result.success) {
        setStatus(`✅ Lançamento realizado! ID: ${result.id}`)
      } else {
        setStatus(`❌ Erro: ${result.error}`)
      }
    } catch (e) {
      setStatus('❌ Erro de conexão')
    }
  }

  if (carregando) {
    return <div className="flex justify-center py-20 text-gray-500">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sercal-navy">Lançamento Rápido</h1>

      {/* Abas */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'despesa', label: '💰 Despesa' },
          { id: 'recebimento', label: '📥 Recebimento' },
          { id: 'transferencia', label: '🔄 Transferência' },
          { id: 'apontamento', label: '👷 Apontamento' },
        ].map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbas(aba.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              abas === aba.id
                ? 'bg-sercal-navy text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {status && (
        <div className="bg-gray-50 border rounded-lg p-3 text-sm">{status}</div>
      )}

      {/* Formulários */}
      {abas === 'despesa' && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold">Nova Despesa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="border rounded-lg p-2" value={desp.obra} onChange={e => setDesp({...desp, obra: e.target.value})}>
              <option value="">Selecione a obra</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nome}</option>)}
            </select>
            <input className="border rounded-lg p-2" placeholder="Fornecedor" value={desp.fornecedor} onChange={e => setDesp({...desp, fornecedor: e.target.value})} />
            <input className="border rounded-lg p-2" placeholder="Categoria" value={desp.categoria} onChange={e => setDesp({...desp, categoria: e.target.value})} />
            <input className="border rounded-lg p-2" placeholder="Subcategoria" value={desp.subcategoria} onChange={e => setDesp({...desp, subcategoria: e.target.value})} />
            <input className="border rounded-lg p-2 md:col-span-2" placeholder="Descrição detalhada" value={desp.descricao} onChange={e => setDesp({...desp, descricao: e.target.value})} />
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Valor R$" value={desp.valor} onChange={e => setDesp({...desp, valor: e.target.value})} />
            <select className="border rounded-lg p-2" value={desp.caixaOrigem} onChange={e => setDesp({...desp, caixaOrigem: e.target.value})}>
              <option value="">Caixa de origem</option>
              {caixas.filter(c => c.saldo !== undefined).map(c => <option key={c.nome} value={c.nome}>{c.nome} ({toBRL(c.saldo)})</option>)}
            </select>
            <select className="border rounded-lg p-2" value={desp.formaPagamento} onChange={e => setDesp({...desp, formaPagamento: e.target.value})}>
              <option value="Pix">Pix</option>
              <option value="Boleto">Boleto</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Depósito">Depósito</option>
            </select>
          </div>
          <button onClick={() => enviar('despesa', desp)} className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-medium">
            Registrar Despesa
          </button>
        </div>
      )}

      {abas === 'recebimento' && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold">Novo Recebimento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="border rounded-lg p-2" value={rec.obra} onChange={e => setRec({...rec, obra: e.target.value})}>
              <option value="">Selecione a obra</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nome}</option>)}
            </select>
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Valor R$" value={rec.valor} onChange={e => setRec({...rec, valor: e.target.value})} />
            <select className="border rounded-lg p-2" value={rec.parcela} onChange={e => setRec({...rec, parcela: e.target.value})}>
              <option value="Única">Única</option>
              <option value="1/3">1/3</option>
              <option value="2/3">2/3</option>
              <option value="3/3">3/3</option>
            </select>
            <input className="border rounded-lg p-2" placeholder="Nota emitida por" value={rec.notaEmitidaPor} onChange={e => setRec({...rec, notaEmitidaPor: e.target.value})} />
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Comissão Ratinho" value={rec.comissaoRatinho} onChange={e => setRec({...rec, comissaoRatinho: e.target.value})} />
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Comissão Mibi" value={rec.comissaoMibi} onChange={e => setRec({...rec, comissaoMibi: e.target.value})} />
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Imposto" value={rec.imposto} onChange={e => setRec({...rec, imposto: e.target.value})} />
            <select className="border rounded-lg p-2" value={rec.caixaDestino} onChange={e => setRec({...rec, caixaDestino: e.target.value})}>
              <option value="">Caixa destino</option>
              {caixas.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
            <select className="border rounded-lg p-2" value={rec.formaPagamento} onChange={e => setRec({...rec, formaPagamento: e.target.value})}>
              <option value="Pix">Pix</option>
              <option value="Boleto">Boleto</option>
              <option value="Depósito">Depósito</option>
              <option value="Cartão">Cartão</option>
            </select>
          </div>
          {rec.valor && (
            <div className="bg-green-50 p-3 rounded-lg text-sm">
              <p>Valor líquido estimado: <strong>{toBRL(Number(rec.valor) - Number(rec.comissaoRatinho || 0) - Number(rec.comissaoMibi || 0) - Number(rec.imposto || 0))}</strong></p>
            </div>
          )}
          <button onClick={() => enviar('recebimento', rec)} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium">
            Registrar Recebimento
          </button>
        </div>
      )}

      {abas === 'transferencia' && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold">Nova Transferência entre Caixas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="border rounded-lg p-2" value={transf.caixaOrigem} onChange={e => setTransf({...transf, caixaOrigem: e.target.value})}>
              <option value="">Caixa de origem</option>
              {caixas.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
            <select className="border rounded-lg p-2" value={transf.caixaDestino} onChange={e => setTransf({...transf, caixaDestino: e.target.value})}>
              <option value="">Caixa de destino</option>
              {caixas.map(c => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
            <input className="border rounded-lg p-2" type="number" step="0.01" placeholder="Valor R$" value={transf.valor} onChange={e => setTransf({...transf, valor: e.target.value})} />
            <input className="border rounded-lg p-2" placeholder="Descrição" value={transf.descricao} onChange={e => setTransf({...transf, descricao: e.target.value})} />
          </div>
          <button onClick={() => enviar('transferencia', transf)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            Registrar Transferência
          </button>
        </div>
      )}

      {abas === 'apontamento' && (
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-bold">Novo Apontamento Diário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="border rounded-lg p-2" value={apo.funcionario} onChange={e => setApo({...apo, funcionario: e.target.value})}>
              <option value="">Selecione o funcionário</option>
              {funcionarios.map(f => <option key={f.codigo} value={f.apelido || f.nome}>{f.apelido || f.nome} - {f.funcao}</option>)}
            </select>
            <select className="border rounded-lg p-2" value={apo.tipo} onChange={e => setApo({...apo, tipo: e.target.value})}>
              <option value="Presencial">Presencial</option>
              <option value="Home Office">Home Office</option>
              <option value="Falta">Falta</option>
              <option value="Atestado">Atestado</option>
              <option value="Férias">Férias</option>
            </select>
            <select className="border rounded-lg p-2" value={apo.obra} onChange={e => setApo({...apo, obra: e.target.value})}>
              <option value="">Local/Obra</option>
              {obras.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} - {o.nome}</option>)}
            </select>
            <input className="border rounded-lg p-2" placeholder="Veículo utilizado" value={apo.veiculo} onChange={e => setApo({...apo, veiculo: e.target.value})} />
            <input className="border rounded-lg p-2" type="number" placeholder="KM rodado" value={apo.kmRodado} onChange={e => setApo({...apo, kmRodado: e.target.value})} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={apo.almoco} onChange={e => setApo({...apo, almoco: e.target.checked})} className="w-5 h-5" />
              <span>Almoço no local?</span>
            </label>
            <input className="border rounded-lg p-2 md:col-span-2" placeholder="Observações" value={apo.obs} onChange={e => setApo({...apo, obs: e.target.value})} />
          </div>
          <button onClick={() => enviar('apontamento', apo)} className="bg-sercal-navy text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition font-medium">
            Registrar Apontamento
          </button>
        </div>
      )}
    </div>
  )
}