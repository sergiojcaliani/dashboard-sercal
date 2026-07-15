import { NextResponse } from 'next/server'

// Coordenadas fixas da Sercal Engenharia (Rua Armando Sales de Oliveira, Getulina - SP)
const EMPRESA_LAT = -21.8011069
const EMPRESA_LNG = -49.9341221

async function geocodeComFallback(endereco: string) {
  // Tenta 3 estratégias: endereço completo → só rua+cidade → só cidade
  const tentativas = [
    endereco,
    endereco.split(',')[0] + ', ' + endereco.split('-')[1]?.trim()?.split(',')[0] || endereco.split(',')[0],
    endereco.split('-')[1]?.trim() || endereco,
  ]

  for (const tentativa of tentativas) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(tentativa)}&limit=1&countrycodes=br`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SercalApp/1.0 (sergio.j.caliani@gmail.com)' },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const data = await res.json()
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      }
    } catch {
      continue
    }
  }
  return null
}

async function calcularRota(origem: { lat: number; lng: number }, destino: { lat: number; lng: number }) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.routes || data.routes.length === 0) return null
    return data.routes[0].distance / 1000
  } catch (err) {
    console.error('Erro na rota:', err)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enderecoObra = searchParams.get('endereco')
  if (!enderecoObra) {
    return NextResponse.json({ error: 'Endereço da obra é obrigatório' }, { status: 400 })
  }
  try {
    const origem = { lat: EMPRESA_LAT, lng: EMPRESA_LNG }
    const destino = await geocodeComFallback(enderecoObra)
    if (!destino) {
      return NextResponse.json({ error: 'Não foi possível localizar o endereço da obra' }, { status: 404 })
    }
    const distanciaKm = await calcularRota(origem, destino)
    if (distanciaKm === null) {
      return NextResponse.json({ error: 'Não foi possível calcular a rota' }, { status: 404 })
    }
    const idaEVolta = Math.round(distanciaKm * 2)
    return NextResponse.json({ distancia: idaEVolta, unidade: 'km' })
  } catch (error) {
    console.error('Erro ao calcular distância:', error)
    return NextResponse.json({ error: 'Erro ao calcular distância' }, { status: 500 })
  }
}