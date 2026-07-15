import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

const sheets = google.sheets({ version: 'v4', auth })

function parseBRL(val: string): number {
  if (!val) return 0
  const cleaned = val.replace('R$ ', '').replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

function toBRL(val: number): string {
  return `R$ ${val.toFixed(2).replace('.', ',')}`
}

function hoje(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export type Caixa = { nome: string; saldo: number; tipo: string }

// ═══════════ DASHBOARD ═══════════

export async function getSaldoCaixas(): Promise<{ nome: string; saldo: number }[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Caixas'!A:B",
  })
  const rows = res.data.values || []
  const caixas: { nome: string; saldo: number }[] = []
  for (let i = 1; i < rows.length; i++) {
    const nome = (rows[i]?.[0] || '').trim()
    if (!nome || nome.toLowerCase().includes('total')) continue
    if (['investimentos', 'comissões pagas', 'vales', 'comissões'].includes(nome.toLowerCase())) continue
    const saldoStr = (rows[i]?.[1] || '0').toString().replace('R$ ', '').replace('.', '').replace(',', '.')
    const saldo = parseFloat(saldoStr) || 0
    if (nome) caixas.push({ nome, saldo })
  }
  return caixas
}

export async function getResumoMes(mes?: number, ano?: number): Promise<{
  receitas: number; despesas: number; saldo: number
}> {
  const agora = new Date()
  const mesAlvo = mes ?? agora.getMonth() + 1
  const anoAlvo = ano ?? agora.getFullYear()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Lançamentos financeiros'!A:O",
  })
  const rows = res.data.values || []
  let receitas = 0
  let despesas = 0

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0]) continue

    const data = parseDataBrasil(r[0])
    if (!data) continue
    if (data.getMonth() + 1 !== mesAlvo || data.getFullYear() !== anoAlvo) continue

    // Coluna E (index 4) = Tipo: "Receita" ou "Despesa"
    // Coluna I (index 8) = Débito
    // Coluna J (index 9) = Crédito
    const tipo = (r[4] || '').toLowerCase().trim()
    const debStr = (r[8] || '0').toString()
    const credStr = (r[9] || '0').toString()
    const debito = parseValorMonetario(debStr)
    const credito = parseValorMonetario(credStr)

    if (tipo === 'receita' || credito > 0) receitas += credito
    if (tipo === 'despesa' || debito > 0) despesas += debito
  }

  return { receitas, despesas, saldo: receitas - despesas }
}

function parseValorMonetario(str: string): number {
  const s = str.toString()
  const negativo = s.includes('-')
  const limpo = s.replace('R$ ', '').replace('-', '').replace(/\./g, '').replace(',', '.')
  const val = parseFloat(limpo) || 0
  return negativo ? -val : val
}

export async function getUltimosLancamentos(dias: number = 7): Promise<any[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Lançamentos financeiros'!A:Z",
  })
  const rows = res.data.values || []
  const hoje = new Date()
  const limite = new Date(hoje.getTime() - dias * 86400000)
  const lancamentos: any[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const dataStr = r[0] || ''
    if (!dataStr) continue

    const data = parseDataBrasil(dataStr)
    if (!data || data < limite) continue

    lancamentos.push({
      data: dataStr,
      tipo: r[2] || '',
      obra: r[3] || '',
      clienteFornecedor: r[4] || '',
      valor: r[5] || '',
      caixa: r[6] || '',
      formaPagamento: r[7] || '',
    })
  }

  // Ordena do mais recente para o mais antigo
  lancamentos.sort((a, b) => {
    const da = parseDataBrasil(a.data)?.getTime() || 0
    const db = parseDataBrasil(b.data)?.getTime() || 0
    return db - da
  })

  return lancamentos.slice(0, 20)
}

export async function getResumoObra(): Promise<any[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Lançamentos financeiros'!A:O",
  })
  const rows = res.data.values || []
  const obras: Record<string, { receitas: number; despesas: number }> = {}

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue
    const obra = (r[3] || '').trim()
    if (!obra) continue

    const debStr = (r[8] || '0').toString()
    const credStr = (r[9] || '0').toString()
    const debito = parseValorMonetario(debStr)
    const credito = parseValorMonetario(credStr)

    if (!obras[obra]) obras[obra] = { receitas: 0, despesas: 0 }
    obras[obra].receitas += credito
    obras[obra].despesas += debito
  }

  return Object.entries(obras)
    .map(([obra, vals]) => ({
      obra,
      receitas: vals.receitas,
      despesas: vals.despesas,
      saldo: vals.receitas - vals.despesas,
    }))
    .sort((a, b) => b.saldo - a.saldo)
}

export async function getApontamentos(tipo: 'dia' | 'mes' | 'data', data?: string): Promise<any[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!A:J",
  })
  const rows = res.data.values || []
  const hoje = new Date()
  const apontamentos: any[] = []

  // Se for filtro por data específica, converte o parâmetro
  let dataFiltro: Date | null = null
  if (tipo === 'data' && data) {
    dataFiltro = parseDataBrasil(data)
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0]) continue

    const dataRegistro = parseDataBrasil(r[0])
    if (!dataRegistro) continue

    if (tipo === 'dia' && !isMesmoDia(dataRegistro, hoje)) continue
    if (tipo === 'mes' && (dataRegistro.getMonth() !== hoje.getMonth() || dataRegistro.getFullYear() !== hoje.getFullYear())) continue
    if (tipo === 'data' && dataFiltro && !isMesmoDia(dataRegistro, dataFiltro)) continue

    apontamentos.push({
      data: r[0],
      funcionario: r[2] || '',
      tipo: r[3] || '',
      obra: r[4] || '',
      almoco: r[5] || '',
      veiculo: r[6] || '',
      km: r[7] || '',
      obs: r[8] || '',
    })
  }

  apontamentos.sort((a, b) => {
    const da = parseDataBrasil(a.data)?.getTime() || 0
    const db = parseDataBrasil(b.data)?.getTime() || 0
    return db - da
  })

  return apontamentos
}

function isMesmoDia(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
}

export async function getCaixas(): Promise<Caixa[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Caixas!A1:B10",
  })
  const rows = res.data.values || []
  const caixas: Caixa[] = []
  for (const row of rows) {
    const nome = row[0]?.trim() || ''
    if (!nome || nome === 'Caixa') continue
    caixas.push({ nome, saldo: parseBRL(row[1] || ''), tipo: nome })
  }
  return caixas
}

export type Lancamento = {
  data: string; descricao: string; debito: number; credito: number
  caixa: string; tipo: string; obra: string
}

export async function getUltimosLancamentosDashboard(dias: number = 7): Promise<any[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Lançamentos financeiros'!A:O",
  })
  const rows = res.data.values || []
  const hoje = new Date()
  const limite = new Date(hoje.getTime() - dias * 86400000)
  const lancamentos: any[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0]) continue

    const data = parseDataBrasil(r[0])
    if (!data || data < limite) continue

    const debStr = (r[8] || '0').toString()
    const credStr = (r[9] || '0').toString()
    const debito = parseValorMonetario(debStr)
    const credito = parseValorMonetario(credStr)

    lancamentos.push({
      data: r[0],
      tipo: r[4] || '',
      obra: r[3] || '',
      clienteFornecedor: r[7] || '',
      valor: credito > 0 ? credito : debito,
      caixa: r[14] || '',
      formaPagamento: r[10] || '',
    })
  }

  lancamentos.sort((a, b) => {
    const da = parseDataBrasil(a.data)?.getTime() || 0
    const db = parseDataBrasil(b.data)?.getTime() || 0
    return db - da
  })

  return lancamentos.slice(0, 20)
}

export type Obra = { codigo: string; nome: string; cliente: string; endereco: string }

export async function getObras(): Promise<Obra[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Cadastro de obras'!A1:D100",
  })
  const rows = res.data.values || []
  const obras: Obra[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[0]) continue
    obras.push({ codigo: r[0], nome: r[1], cliente: r[2] || '', endereco: r[3] || '' })
  }
  return obras
}

export type Funcionario = { codigo: string; apelido: string; nome: string; funcao: string }

export async function getVeiculos(): Promise<string[]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'Cadastro de veículos'!B:B",
    })
    const rows = res.data.values || []
    const veiculos: string[] = []
    for (let i = 1; i < rows.length; i++) {
      const v = (rows[i]?.[0] || '').trim()
      if (v) veiculos.push(v)
    }
    return veiculos
  } catch (error) {
    console.error('Erro ao ler veiculos:', error)
    return []
  }
}

export async function getFuncionarios(): Promise<Funcionario[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Cadastro de Funcionários'!A:F",
  })
  const rows = res.data.values || []
  const funcionarios: Funcionario[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0]) continue
    funcionarios.push({
      codigo: (r[0] || '').trim(),
      apelido: (r[1] || '').trim(),
      nome: (r[2] || '').trim(),
      funcao: (r[3] || '').trim(),
    })
  }
  return funcionarios
}
type ListaAuxiliar = {
  tipo: string
  valor: string
}

export async function getListasAuxiliares(): Promise<ListaAuxiliar[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Listas auxiliares'!A:B",
  })
  const rows = res.data.values || []
  const listas: ListaAuxiliar[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[0] && !r[1]) continue
    listas.push({
      tipo: (r[0] || '').trim(),
      valor: (r[1] || '').trim(),
    })
  }
  return listas.filter(l => l.tipo || l.valor)
}
export async function addDespesa(d: {
  obra: string; fornecedor: string; categoria: string
  subcategoria: string; descricao: string; valor: number
  caixaOrigem: string; formaPagamento: string
}) {
  const hojeStr = hoje()

  // 1. Descobrir a próxima linha vazia
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Despesas'!A:A",
  })
  const linhas = getRes.data.values || []
  const proximaLinha = linhas.length + 1

  // 2. Gerar o próximo ID automático (DES-001, DES-002...)
  const resIds = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Despesas'!B:B",
  })
  const idsExistentes = resIds.data.values || []
  let ultimoNumero = 0
  for (const row of idsExistentes) {
    const id = (row[0] || '').toString().trim()
    if (id.startsWith('DES-')) {
      const num = parseInt(id.replace('DES-', ''), 10)
      if (!isNaN(num) && num > ultimoNumero) {
        ultimoNumero = num
      }
    }
  }
  const novoId = `DES-${String(ultimoNumero + 1).padStart(3, '0')}`

  // 3. Escrever TUDO (incluindo o ID na coluna B)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Despesas'!A${proximaLinha}:B${proximaLinha}`, values: [[hojeStr, novoId]] },
        { range: `'Despesas'!C${proximaLinha}:J${proximaLinha}`, values: [[
          d.obra, d.fornecedor, d.categoria,
          d.subcategoria, d.descricao, d.valor,
          d.caixaOrigem, d.formaPagamento
        ]]},
      ],
    },
  })

  return { id: novoId }
}

export async function addRecebimento(r: {
  obra: string
  valor: number
  parcela: string
  formaPagamento: string
}) {
  const hojeStr = hoje()

  // 1. Descobrir a próxima linha vazia
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Recebimentos'!A:A",
  })
  const linhas = getRes.data.values || []
  const proximaLinha = linhas.length + 1

  // 2. Gerar o próximo ID automático (REC-001, REC-002...)
  const resIds = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Recebimentos'!B:B",
  })
  const idsExistentes = resIds.data.values || []
  let ultimoNumero = 0
  for (const row of idsExistentes) {
    const id = (row[0] || '').toString().trim()
    if (id.startsWith('REC-')) {
      const num = parseInt(id.replace('REC-', ''), 10)
      if (!isNaN(num) && num > ultimoNumero) {
        ultimoNumero = num
      }
    }
  }
  const novoId = `REC-${String(ultimoNumero + 1).padStart(3, '0')}`

  // 3. Escrever TUDO (incluindo o ID na coluna B)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Recebimentos'!A${proximaLinha}:B${proximaLinha}`, values: [[hojeStr, novoId]] },
        { range: `'Recebimentos'!C${proximaLinha}:E${proximaLinha}`, values: [[r.obra, r.valor, r.parcela]] },
        { range: `'Recebimentos'!M${proximaLinha}`, values: [[r.formaPagamento]] },
      ],
    },
  })

  return { id: novoId }
}


export async function addTransferencia(t: {
  caixaOrigem: string; caixaDestino: string
  valor: number; subcategoria: string; descricao: string
}) {
  const hojeStr = hoje()

  // 1. Descobrir a próxima linha vazia
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Transferências'!A:A",
  })
  const linhas = getRes.data.values || []
  const proximaLinha = linhas.length + 1

  // 2. Gerar o próximo ID automático (TRA-001, TRA-002...)
  const resIds = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Transferências'!A:A",
  })
  const idsExistentes = resIds.data.values || []
  let ultimoNumero = 0
  for (const row of idsExistentes) {
    const id = (row[0] || '').toString().trim()
    if (id.startsWith('TRA-')) {
      const num = parseInt(id.replace('TRA-', ''), 10)
      if (!isNaN(num) && num > ultimoNumero) {
        ultimoNumero = num
      }
    }
  }
  const novoId = `TRA-${String(ultimoNumero + 1).padStart(3, '0')}`

  // 3. Escrever TUDO (incluindo o ID na coluna A)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Transferências'!A${proximaLinha}:B${proximaLinha}`, values: [[novoId, hojeStr]] },
        { range: `'Transferências'!C${proximaLinha}:H${proximaLinha}`, values: [[
          t.valor, t.caixaOrigem, t.caixaDestino,
          t.subcategoria, 'Pix', t.descricao
        ]]},
      ],
    },
  })
  return 'ok'
}

export async function addApontamento(a: {
  funcionario: string; tipo: string; obra: string
  almoco: string; veiculo: string; obs: string; km?: number
}) {
  const hojeStr = hoje()

  // 1. Descobrir a próxima linha vazia
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!A:A",
  })
  const linhas = getRes.data.values || []
  const proximaLinha = linhas.length + 1

  // 2. Gerar o próximo ID automático (APO-001, APO-002...)
  const resIds = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!B:B",
  })
  const idsExistentes = resIds.data.values || []
  let ultimoNumero = 0
  for (const row of idsExistentes) {
    const id = (row[0] || '').toString().trim()
    if (id.startsWith('APO-')) {
      const num = parseInt(id.replace('APO-', ''), 10)
      if (!isNaN(num) && num > ultimoNumero) {
        ultimoNumero = num
      }
    }
  }
  const novoId = `APO-${String(ultimoNumero + 1).padStart(3, '0')}`
  // 3. Escrever TUDO (incluindo o ID na coluna B)
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: `'Apontamento Diário'!A${proximaLinha}:B${proximaLinha}`, values: [[hojeStr, novoId]] },
        { range: `'Apontamento Diário'!C${proximaLinha}:I${proximaLinha}`, values: [[
          a.funcionario, a.tipo, a.obra,
          a.almoco, a.veiculo, a.km ?? '', a.obs
        ]]},
      ],
    },
  })
  return 'ok'
}
export async function addApontamentosBatch(params: {
  data: string
  obra: string
  funcionarios: Array<{
    funcionario: string
    tipo: string
    almoco: string
    veiculo: string
    obs: string
    km?: number
  }>
}) {
  const { data, obra, funcionarios } = params
  const qtd = funcionarios.length
  if (qtd === 0) return { ids: [] }

  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!A:A",
  })
  const linhas = getRes.data.values || []
  const proximaLinha = linhas.length + 1

  const resIds = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!B:B",
  })
  const idsExistentes = resIds.data.values || []
  let ultimoNumero = 0
  for (const row of idsExistentes) {
    const id = (row[0] || '').toString().trim()
    if (id.startsWith('APO-')) {
      const num = parseInt(id.replace('APO-', ''), 10)
      if (!isNaN(num) && num > ultimoNumero) {
        ultimoNumero = num
      }
    }
  }

  const ids: string[] = []
  const dataValues: string[][] = []
  for (let i = 0; i < qtd; i++) {
    const f = funcionarios[i]
    const novoId = `APO-${String(ultimoNumero + i + 1).padStart(3, '0')}`
    ids.push(novoId)
    dataValues.push([data, novoId, f.funcionario, f.tipo, obra, f.almoco, f.veiculo, String(f.km ?? ''), f.obs])
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'Apontamento Diário'!A${proximaLinha}:I${proximaLinha + qtd - 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: dataValues,
    },
  })

  return { ids }
}
function parseDataBrasil(dataStr: string): Date | null {
  // Tenta DD/MM/AAAA
  const parts = dataStr.split('/')
  if (parts.length === 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, a = parseInt(parts[2])
    if (!isNaN(d) && !isNaN(m) && !isNaN(a)) return new Date(a, m, d)
  }
  // Tenta AAAA-MM-DD
  const d2 = new Date(dataStr)
  if (!isNaN(d2.getTime())) return d2
  return null
}

