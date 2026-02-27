'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, MapPin, Navigation, Maximize2, X, Loader2, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Ponto {
  latitude: number;
  longitude: number;
  endereco?: string;
  nomeRecebedor?: string;
}

interface MapaRotaProps {
  origem: Ponto;
  destinos: Ponto[];
  tipoVeiculo?: string;
  distanciaTotal?: number;
  tempoEstimado?: number;
}

function gerarUrlMapa(
  origem: Ponto,
  destinos: Ponto[],
  largura: number = 800,
  altura: number = 400
): string {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  
  if (!apiKey || !origem.latitude || !origem.longitude) {
    return '';
  }

  // Marcador de origem (verde)
  const marcadorOrigem = `lonlat:${origem.longitude},${origem.latitude};type:awesome;color:%2322c55e;size:large;icon:home`;
  
  // Marcadores de destino (vermelho) com números
  const marcadoresDestinos = destinos
    .filter(d => d.latitude && d.longitude)
    .map((dest, idx) => 
      `lonlat:${dest.longitude},${dest.latitude};type:awesome;color:%23dc2626;size:medium;text:${idx + 1}`
    ).join('|');

  // Calcular centro e zoom
  const pontos = [origem, ...destinos].filter(p => p.latitude && p.longitude);
  const allLats = pontos.map(p => p.latitude);
  const allLngs = pontos.map(p => p.longitude);
  const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
  const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
  
  const latDiff = Math.max(...allLats) - Math.min(...allLats);
  const lngDiff = Math.max(...allLngs) - Math.min(...allLngs);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  let zoom = 14;
  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;

  // Criar polyline da rota (formato: lat,lon,lat,lon,...)
  const pontosRota = [origem, ...destinos].filter(p => p.latitude && p.longitude);
  const polylineCoords = pontosRota.map(p => `${p.latitude},${p.longitude}`).join(',');

  // Montar marcadores
  const markers = marcadoresDestinos ? `${marcadorOrigem}|${marcadoresDestinos}` : marcadorOrigem;

  // Construir URL do mapa estático Geoapify
  const baseUrl = 'https://www.geoapify.com/static/292ec744fd20766a29caa87a023dde55/216f6/staticmap-with-markers-1x1.png';
  const params = new URLSearchParams({
    style: 'osm-bright',
    width: largura.toString(),
    height: altura.toString(),
    center: `lonlat:${centerLng},${centerLat}`,
    zoom: zoom.toString(),
    marker: markers,
    apiKey: apiKey,
  });

  // Adicionar polyline da rota (linha conectando os pontos)
  const geometryParam = `polyline:${polylineCoords};linewidth:3;linecolor:%23dc2626;lineopacity:0.7`;

  return `${baseUrl}?${params.toString()}&geometry=${encodeURIComponent(geometryParam)}`;
}

export function MapaRota({ origem, destinos, tipoVeiculo, distanciaTotal, tempoEstimado }: MapaRotaProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  const urlMapa = gerarUrlMapa(origem, destinos, 800, 400);
  const urlMapaGrande = gerarUrlMapa(origem, destinos, 1200, 700);

  if (!urlMapa) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Não foi possível gerar o mapa</p>
          <p className="text-sm">Verifique se as coordenadas estão configuradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="w-5 h-5 text-red-500" />
              Preview da Rota
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAberto(true)}
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              Ampliar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Info da rota */}
          <div className="px-4 py-2 bg-muted border-b flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">Origem</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">{destinos.length} entrega(s)</span>
            </div>
            {distanciaTotal !== undefined && (
              <Badge variant="outline">{distanciaTotal.toFixed(1)} km</Badge>
            )}
            {tempoEstimado !== undefined && (
              <Badge variant="outline">{tempoEstimado} min</Badge>
            )}
          </div>

          {/* Mapa */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            )}
            {error ? (
              <div className="h-64 flex items-center justify-center bg-gray-100 text-muted-foreground">
                <div className="text-center">
                  <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Erro ao carregar mapa</p>
                </div>
              </div>
            ) : (
              <img
                src={urlMapa}
                alt="Mapa da rota"
                className="w-full h-auto"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
              />
            )}
          </div>

          {/* Lista de paradas */}
          <div className="p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sequência de entregas:</p>
            <div className="flex items-start gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <Home className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">Origem</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex flex-wrap items-center gap-1">
                {destinos.map((dest, idx) => (
                  <span key={idx} className="inline-flex items-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {idx + 1}
                    </span>
                    {dest.nomeRecebedor && (
                      <span className="ml-1 text-xs text-muted-foreground">{dest.nomeRecebedor}</span>
                    )}
                    {idx < destinos.length - 1 && <span className="mx-1 text-gray-400">→</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal com mapa ampliado */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-red-500" />
              Mapa da Rota
              {tipoVeiculo && <Badge className="ml-2">{tipoVeiculo}</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img
              src={urlMapaGrande}
              alt="Mapa da rota ampliado"
              className="w-full h-auto"
            />
          </div>
          <div className="p-4 bg-muted border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Origem:</p>
                <p className="text-muted-foreground">{origem.endereco ?? 'Não informado'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Destinos ({destinos.length}):</p>
                <ul className="space-y-1">
                  {destinos.map((dest, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span>{dest.nomeRecebedor ?? dest.endereco ?? 'Destino'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
