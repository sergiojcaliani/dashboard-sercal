import { NextResponse } from 'next/server'

const EMPRESA_ENDERECO = 'R. Armando Sales de Oliveira, 711A, Centro, Getulina, SP, 16450-017'

async function geocode(endereco: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&countrycodes=br`
  const res = await fetch(url, { headers: { 'User-Agent': 'SercalApp/1.0' } })
  const data = await res.json()
  if (!data || data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

async function calcularRota(origem: { lat: number; lng: number }, destino: { lat: number; lng: number }) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=false`
  const res = await fetch(url)
  const data = await res.json()
  if (!data || !data.routes || data.routes.length === 0) return null
  return data.routes[0].distance / 1000
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enderecoObra = searchParams.get('endereco')

  if (!enderecoObra) {
    return NextResponse.json({ error: 'Endereço da obra é obrigatório' }, { status: 400 })
  }

  try {
    const origem = await geocode(EMPRESA_ENDERECO)
    if (!origem) {
      return NextResponse.json({ error: 'Não foi possível localizar o endereço da empresa' }, { status: 500 })
    }

    const destino = await geocode(enderecoObra)
    if (!destino) {
      return NextResponse.json({ error: 'Não foi possível localizar o endereço da obra' }, { status: 500 })
    }

    const distanciaKm = await calcularRota(origem, destino)
    if (distanciaKm === null) {
      return NextResponse.json({ error: 'Não foi possível calcular a rota' }, { status: 500 })
    }

    const idaEVolta = Math.round(distanciaKm * 2)

    return NextResponse.json({ distancia: idaEVolta, unidade: 'km' })
  } catch (error) {
    console.error('Erro ao calcular distância:', error)
    return NextResponse.json({ error: 'Erro ao calcular distância' }, { status: 500 })
  }
}