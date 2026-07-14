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

export async function getUltimosLancamentos(limite = 30): Promise<Lancamento[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Lançamentos financeiros'!A1:O2000",
  })
  const rows = res.data.values || []
  const lancamentos: Lancamento[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[0]) continue
    lancamentos.push({
      data: r[0] || '',
      tipo: (r[4] as string) || '',
      descricao: r[7] || '',
      debito: parseBRL(r[8] || ''),
      credito: parseBRL(r[9] || ''),
      caixa: r[14] || '',
      obra: r[3] || '',
    })
  }
  return lancamentos.slice(-limite).reverse()
}

export type Obra = { codigo: string; nome: string; cliente: string }

export async function getObras(): Promise<Obra[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Cadastro de obras'!A1:C100",
  })
  const rows = res.data.values || []
  const obras: Obra[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[0]) continue
    obras.push({ codigo: r[0], nome: r[1], cliente: r[2] || '' })
  }
  return obras
}

export type Funcionario = { codigo: string; apelido: string; nome: string; funcao: string }

export async function getFuncionarios(): Promise<Funcionario[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Cadastro de funcionários'!A1:R50",
  })
  const rows = res.data.values || []
  const funcs: Funcionario[] = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[0]) continue
    funcs.push({
      codigo: r[0], apelido: (r[1] || '').trim(),
      nome: r[2] || '', funcao: r[4] || '',
    })
  }
  return funcs.filter(f => f.apelido || f.nome)
}

export async function addDespesa(d: {
  obra: string; fornecedor: string; categoria: string
  subcategoria: string; descricao: string; valor: number
  caixaOrigem: string; formaPagamento: string
}) {
  const hojeStr = hoje()
  const id = `DES-${Date.now().toString(36).toUpperCase()}`
  const values = [[
    hojeStr, id, d.obra, d.fornecedor, d.categoria,
    d.subcategoria, d.descricao, toBRL(d.valor),
    d.caixaOrigem, d.formaPagamento, '', 'Sim'
  ]]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Despesas'!A:L",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return id
}

export async function addRecebimento(r: {
  obra: string; valor: number; parcela: string
  notaEmitidaPor: string; comissaoRatinho: number
  comissaoMibi: number; imposto: number
  caixaDestino: string; formaPagamento: string
}) {
  const hojeStr = hoje()
  const id = `REC-${Date.now().toString(36).toUpperCase()}`
  const valorLiquido = r.valor - r.comissaoRatinho - r.comissaoMibi - r.imposto
  const values = [[
    hojeStr, id, r.obra, toBRL(r.valor), r.parcela,
    r.notaEmitidaPor, toBRL(r.comissaoRatinho), toBRL(r.comissaoMibi),
    toBRL(r.imposto), r.caixaDestino, toBRL(valorLiquido),
    '', r.formaPagamento, 'Sim'
  ]]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Recebimentos'!A:N",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return id
}

export async function addTransferencia(t: {
  caixaOrigem: string; caixaDestino: string
  valor: number; subcategoria: string; descricao: string
}) {
  const hojeStr = hoje()
  const id = `TRA-${Date.now().toString(36).toUpperCase()}`
  const values = [[
    id, hojeStr, toBRL(t.valor), t.caixaOrigem, t.caixaDestino,
    t.subcategoria, 'Pix', t.descricao, 'Sim'
  ]]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Transferências'!A:I",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return id
}

export async function addApontamento(a: {
  funcionario: string; tipo: string; obra: string
  almoco: boolean; veiculo: string; kmRodado: number; obs: string
}) {
  const hojeStr = hoje()
  const id = `APO-${Date.now().toString(36).toUpperCase()}`
  const values = [[
    hojeStr, id, a.funcionario, a.tipo, a.obra,
    a.almoco ? 'Sim' : 'Não', a.veiculo,
    a.kmRodado > 0 ? String(a.kmRodado) : '', a.obs, 'Sim'
  ]]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Apontamento Diário'!A:J",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
  return id
}